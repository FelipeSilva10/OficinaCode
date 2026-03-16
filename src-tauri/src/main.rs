#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::process::Command;
use std::env;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Emitter;
use std::time::Duration;

struct AppState {
    is_reading_serial: Arc<AtomicBool>,
}

/// Tenta encontrar o arduino-cli no PATH da máquina.
/// PLANO B: Se não achar, faz o download do binário oficial da internet,
/// descompacta na pasta temporária do sistema e retorna o caminho.
fn find_or_download_cli() -> Result<String, String> {
    // 1. Tenta achar o comando no PATH global
    if Command::new("arduino-cli").arg("version").output().is_ok() {
        println!(">>> [CLI] arduino-cli encontrado no PATH.");
        return Ok("arduino-cli".to_string());
    }

    // 2. Define a pasta local/temporária (Plano B)
    let temp_dir = env::temp_dir().join("oficina_code_cli");
    let exe_name = if cfg!(target_os = "windows") { "arduino-cli.exe" } else { "arduino-cli" };
    let local_cli = temp_dir.join(exe_name);

    // Se já tivermos baixado antes, apenas usamos ele
    if local_cli.exists() {
        println!(">>> [CLI] arduino-cli encontrado localmente em {:?}", local_cli);
        return Ok(local_cli.to_string_lossy().to_string());
    }

    // 3. PLANO B: Baixar e extrair
    println!(">>> [CLI] arduino-cli não encontrado no sistema. Iniciando PLANO B: Download...");
    let _ = fs::create_dir_all(&temp_dir);

    // Escolhe a URL oficial baseada no Sistema Operacional
    let url = if cfg!(target_os = "windows") {
        "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip"
    } else if cfg!(target_os = "macos") {
        "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz"
    } else {
        "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz"
    };

    let archive_name = if cfg!(target_os = "windows") { "cli.zip" } else { "cli.tar.gz" };
    let archive_path = temp_dir.join(archive_name);

    println!(">>> [CLI] Baixando CLI de {} ...", url);
    // Usamos o curl (nativo no Win 10+, Mac e Linux) para não precisar de bibliotecas extras
    let curl_status = Command::new("curl")
        .args(["-L", url, "-o", archive_path.to_str().unwrap()])
        .status()
        .map_err(|e| format!("Erro ao executar curl (download): {}", e))?;

    if !curl_status.success() {
        return Err("Falha ao baixar o arquivo do arduino-cli.".to_string());
    }

    println!(">>> [CLI] Descompactando CLI...");
    // Usamos tar (nativo no Win 10+, Mac e Linux)
    let tar_status = Command::new("tar")
        .args(["-xf", archive_path.to_str().unwrap(), "-C", temp_dir.to_str().unwrap()])
        .status()
        .map_err(|e| format!("Erro ao executar tar (extração): {}", e))?;

    if !tar_status.success() {
        return Err("Falha ao descompactar o arduino-cli.".to_string());
    }

    // Garante permissão de execução no Linux/Mac
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(mut perms) = fs::metadata(&local_cli).map(|m| m.permissions()) {
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&local_cli, perms);
        }
    }

    if local_cli.exists() {
        println!(">>> [CLI] Download e instalação concluídos com sucesso!");
        // Limpa o arquivo zip/tar.gz para poupar espaço
        let _ = fs::remove_file(archive_path);
        Ok(local_cli.to_string_lossy().to_string())
    } else {
        Err("arduino-cli não foi encontrado mesmo após a extração.".to_string())
    }
}

/// Garante que os pacotes de placas (cores) estejam instalados.
/// Se for ESP32, adiciona o gerenciador de URLs antes.
fn ensure_core_installed(cli_path: &str, placa: &str) -> Result<String, String> {
    let (core, fqbn) = match placa {
        "uno"   => ("arduino:avr", "arduino:avr:uno"),
        "nano"  => ("arduino:avr", "arduino:avr:nano"),
        "esp32" => ("esp32:esp32", "esp32:esp32:esp32"),
        _       => ("arduino:avr", "arduino:avr:uno"),
    };

    println!(">>> [CORE] Verificando se o pacote da placa '{}' está instalado...", core);
    let list_output = Command::new(cli_path).arg("core").arg("list").output()
        .map_err(|e| format!("Erro ao listar cores: {}", e))?;
    
    let list_str = String::from_utf8_lossy(&list_output.stdout);

    if !list_str.contains(core) {
        println!(">>> [CORE] Pacote '{}' NÃO encontrado. Iniciando instalação...", core);

        // --- PASSO EXTRA PARA ESP32 ---
        if core == "esp32:esp32" {
            println!(">>> [CORE] ESP32 detectado. Configurando URLs adicionais...");
            // Inicializa a config (ignoramos falha se já existir)
            let _ = Command::new(cli_path).args(["config", "init"]).output();

            // Adiciona a URL do gerenciador de placas da Espressif
            let esp_url = "https://espressif.github.io/arduino-esp32/package_esp32_index.json";
            let add_url = Command::new(cli_path)
                .args(["config", "add", "board_manager.additional_urls", esp_url])
                .output()
                .map_err(|e| format!("Erro na injeção da URL do ESP32: {}", e))?;

            if !add_url.status.success() {
                let err = String::from_utf8_lossy(&add_url.stderr);
                return Err(format!("Erro ao configurar URL do ESP32 no YAML: {}", err));
            }
        }

        // Atualiza a lista de placas (equivalente a clicar em atualizar no Gerenciador de Placas)
        println!(">>> [CORE] Atualizando o index de pacotes (isso pode levar alguns segundos)...");
        let update = Command::new(cli_path).args(["core", "update-index"]).output()
            .map_err(|e| format!("Erro no update-index: {}", e))?;
            
        if !update.status.success() {
            return Err("Falha ao atualizar o index das placas (sem internet?).".to_string());
        }

        // Instala o core efetivamente
        println!(">>> [CORE] Baixando e instalando o core {}...", core);
        let install = Command::new(cli_path).args(["core", "install", core]).output()
            .map_err(|e| format!("Erro ao instalar core: {}", e))?;

        if !install.status.success() {
            let err = String::from_utf8_lossy(&install.stderr);
            return Err(format!("Erro fatal ao instalar pacote {}:\n{}", core, err));
        }

        println!(">>> [CORE] Instalação do core concluída com sucesso!");
    } else {
        println!(">>> [CORE] Pacote '{}' já está instalado e pronto para uso.", core);
    }

    Ok(fqbn.to_string())
}

#[tauri::command]
fn upload_code(
    codigo: String,
    placa: String,
    porta: String,
    state: tauri::State<AppState>,
) -> Result<String, String> {
    println!(">>> [1] Iniciando processo de envio...");
    println!(">>> [2] Desligando o monitor serial (liberando a porta)...");
    state.is_reading_serial.store(false, Ordering::Relaxed);
    std::thread::sleep(Duration::from_millis(500));

    // Passo Dinâmico: Achar o CLI (Plano A ou Plano B)
    println!(">>> [3] Buscando utilitário arduino-cli...");
    let cli = find_or_download_cli()?;

    // Passo Dinâmico: Garantir Core e FQBN
    println!(">>> [4] Resolvendo dependências da placa {}", placa);
    let fqbn = ensure_core_installed(&cli, &placa)?;

    let temp_dir    = env::temp_dir();
    let sketch_dir  = temp_dir.join("oficina_code_sketch");
    let sketch_path = sketch_dir.join("oficina_code_sketch.ino");

    println!(">>> [5] Criando pasta temporária do sketch...");
    let _ = fs::create_dir_all(&sketch_dir);

    println!(">>> [6] Salvando o código C++ gerado...");
    if let Err(e) = fs::write(&sketch_path, codigo) {
        return Err(format!("Erro ao criar arquivo: {}", e));
    }

    println!(">>> [7] Compilando com FQBN: {}", fqbn);
    let compile_output = match Command::new(&cli)
        .arg("compile")
        .arg("-b").arg(&fqbn)
        .arg(&sketch_dir)
        .output()
    {
        Ok(out) => out,
        Err(e)  => return Err(format!("Erro no processo de compilação: {}", e)),
    };

    if !compile_output.status.success() {
        let erro = String::from_utf8_lossy(&compile_output.stderr);
        return Err(format!("Erro no código (Compilação falhou):\n{}", erro));
    }

    println!(">>> [8] Enviando para a porta {}...", porta);
    let upload_output = match Command::new(&cli)
        .arg("upload")
        .arg("-b").arg(&fqbn)
        .arg("-p").arg(&porta)
        .arg(&sketch_dir)
        .output()
    {
        Ok(out) => out,
        Err(e)  => return Err(format!("Erro upload: {}", e)),
    };

    if !upload_output.status.success() {
        let erro = String::from_utf8_lossy(&upload_output.stderr);
        return Err(format!("Erro ao gravar na porta {}:\n{}", porta, erro));
    }

    println!(">>> [9] UPLOAD CONCLUÍDO COM SUCESSO!");
    Ok("Sucesso!".to_string())
}

#[tauri::command]
fn start_serial(
    porta: String,
    window: tauri::Window,
    state: tauri::State<AppState>,
) -> Result<String, String> {
    state.is_reading_serial.store(false, Ordering::Relaxed);
    std::thread::sleep(Duration::from_millis(200));

    let is_reading = Arc::clone(&state.is_reading_serial);
    is_reading.store(true, Ordering::Relaxed);

    std::thread::spawn(move || {
        let mut port = match serialport::new(&porta, 9600)
            .timeout(Duration::from_millis(100))
            .open()
        {
            Ok(p)  => p,
            Err(_) => {
                let _ = window.emit("serial-error", format!("Não foi possível abrir a porta {}", porta));
                return;
            }
        };

        let mut serial_buf: Vec<u8> = vec![0; 1000];
        let mut string_acumulada = String::new();

        while is_reading.load(Ordering::Relaxed) {
            match port.read(serial_buf.as_mut_slice()) {
                Ok(t) if t > 0 => {
                    let pedaco = String::from_utf8_lossy(&serial_buf[..t]);
                    string_acumulada.push_str(&pedaco);

                    if string_acumulada.len() > 4000 {
                        string_acumulada.clear();
                    }

                    while let Some(pos) = string_acumulada.find('\n') {
                        let frase = string_acumulada[..pos].trim_end().to_string();
                        string_acumulada = string_acumulada[pos + 1..].to_string();
                        let _ = window.emit("serial-message", frase);
                        std::thread::sleep(Duration::from_millis(20));
                    }
                }
                _ => {
                    std::thread::sleep(Duration::from_millis(10));
                }
            }
        }
    });

    Ok("Monitor iniciado".to_string())
}

#[tauri::command]
fn stop_serial(state: tauri::State<AppState>) -> Result<String, String> {
    state.is_reading_serial.store(false, Ordering::Relaxed);
    Ok("Monitor parado".to_string())
}

#[tauri::command]
fn get_available_ports() -> Result<Vec<String>, String> {
    match serialport::available_ports() {
        Ok(ports) => {
            let mut port_names: Vec<String> = ports
                .into_iter()
                .filter(|p| matches!(p.port_type, serialport::SerialPortType::UsbPort(_)))
                .map(|p| p.port_name)
                .collect();
            port_names.sort();
            Ok(port_names)
        }
        Err(e) => Err(format!("Erro ao buscar portas USB: {}", e)),
    }
}

fn main() {
    let app_state = AppState {
        is_reading_serial: Arc::new(AtomicBool::new(false)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            upload_code,
            start_serial,
            stop_serial,
            get_available_ports
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}