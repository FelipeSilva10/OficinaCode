import { supabase } from '../lib/supabase';
import { BoardKey } from '../blockly/blocks';

export const ProjectService = {
  // Vai buscar os dados iniciais do projeto
  async getProjectData(projectId: string) {
    return await supabase
      .from('projetos')
      .select('nome, target_board, workspace_data')
      .eq('id', projectId)
      .single();
  },

  // Atualiza apenas a placa selecionada
  async updateBoard(projectId: string, board: BoardKey) {
    return await supabase
      .from('projetos')
      .update({ target_board: board })
      .eq('id', projectId);
  },

  // Guarda o progresso total do projeto (blocos e placa)
  async saveProject(projectId: string, board: BoardKey, workspaceData64: string) {
    return await supabase
      .from('projetos')
      .update({
        workspace_data: workspaceData64,
        target_board: board,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
  }
};