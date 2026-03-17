import { useEffect, useState } from 'react';
import * as Blockly from 'blockly/core';

interface Category {
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  activeColor: string;
}

const CATEGORIES: Category[] = [
  {
    label: 'Entrada e Saída Digital',
    shortLabel: 'Digital',
    icon: '⚡',
    color: '#2980b9',
    activeColor: '#3498db',
  },
  {
    label: 'Controle',
    shortLabel: 'Controle',
    icon: '🔁',
    color: '#1e8449',
    activeColor: '#27ae60',
  },
  {
    label: 'Condições',
    shortLabel: 'SE/SE-NÃO',
    icon: '🔀',
    color: '#7d3c98',
    activeColor: '#9b59b6',
  },
  {
    label: 'Sensor de Distância',
    shortLabel: 'Distância',
    icon: '📡',
    color: '#d35400',
    activeColor: '#e67e22',
  },
  {
    label: 'Comunicação Serial',
    shortLabel: 'Serial',
    icon: '💬',
    color: '#117a65',
    activeColor: '#16a085',
  },
];

interface Props {
  workspace: Blockly.WorkspaceSvg | null;
  readOnly?: boolean;
}

export function CompactToolbox({ workspace, readOnly }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Sync with external toolbox selection (e.g. user clicked native toolbox)
  useEffect(() => {
    if (!workspace) return;
    const listener = () => {
      const toolbox = workspace.getToolbox() as any;
      if (!toolbox) return;
      const selected = toolbox.getSelectedItem?.();
      if (!selected) {
        setActiveIndex(null);
        return;
      }
      const pos = toolbox.getToolboxItems?.()?.indexOf(selected);
      if (typeof pos === 'number' && pos >= 0) setActiveIndex(pos);
    };
    workspace.addChangeListener(listener);
    return () => workspace.removeChangeListener(listener);
  }, [workspace]);

  const handleClick = (index: number) => {
    const toolbox = workspace?.getToolbox() as any;
    if (!toolbox) return;

    if (activeIndex === index) {
      toolbox.clearSelection?.();
      setActiveIndex(null);
    } else {
      toolbox.selectItemByPosition?.(index);
      setActiveIndex(index);
    }
  };

  if (readOnly) return null;

  return (
    <aside className="compact-toolbox" aria-label="Categorias de blocos">
      <div className="ct-header">
        <span title="Categorias de blocos">🧩</span>
      </div>
      {CATEGORIES.map((cat, i) => {
        const isActive = activeIndex === i;
        return (
          <button
            key={i}
            className={`ct-btn ${isActive ? 'ct-active' : ''}`}
            style={
              {
                '--cat-color': cat.color,
                '--cat-active': cat.activeColor,
              } as React.CSSProperties
            }
            onClick={() => handleClick(i)}
            title={cat.label}
            aria-label={cat.label}
            aria-pressed={isActive}
          >
            <span className="ct-icon">{cat.icon}</span>
            <span className="ct-label">{cat.shortLabel}</span>
            {isActive && <span className="ct-indicator" />}
          </button>
        );
      })}
    </aside>
  );
}
