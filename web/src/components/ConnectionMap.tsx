import { useMemo, useState } from 'react';
import { Cloud, Lock } from 'lucide-react';
import type { TuckItem } from '../types';

interface ConnectionMapProps {
  items: TuckItem[];
  synthesizing: boolean;
  onSynthesizeCluster: (clusterItems: TuckItem[]) => void;
}

interface GraphNode {
  id: string;
  label: string;
  kind: 'tag' | 'item';
  x: number;
  y: number;
  item?: TuckItem;
  count?: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

export function ConnectionMap({
  items,
  synthesizing,
  onSynthesizeCluster,
}: ConnectionMapProps) {
  const activeItems = useMemo(
    () => items.filter((i) => i.status !== 'let-go').slice(0, 14),
    [items]
  );

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TuckItem | null>(null);

  const { nodes, edges, tagClusters } = useMemo(() => {
    const tagMap = new Map<string, TuckItem[]>();
    for (const item of activeItems) {
      for (const tag of item.tags) {
        const list = tagMap.get(tag) || [];
        list.push(item);
        tagMap.set(tag, list);
      }
    }

    const topTags = Array.from(tagMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    const cx = 420;
    const cy = 210;
    const builtNodes: GraphNode[] = [];
    const builtEdges: GraphEdge[] = [];

    // Place tag hubs on inner ring
    topTags.forEach(([tag, list], idx) => {
      const angle = (idx / Math.max(1, topTags.length)) * Math.PI * 2 - Math.PI / 2;
      const rx = topTags.length === 1 ? 0 : 120;
      const ry = topTags.length === 1 ? 0 : 72;
      builtNodes.push({
        id: `tag:${tag}`,
        label: `#${tag}`,
        kind: 'tag',
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        count: list.length,
      });
    });

    // Place saved items on outer ring
    activeItems.forEach((item, idx) => {
      const angle = (idx / Math.max(1, activeItems.length)) * Math.PI * 2 - Math.PI / 3;
      const rx = 310;
      const ry = 165;
      builtNodes.push({
        id: `item:${item.id}`,
        label: item.title.length > 26 ? `${item.title.slice(0, 24)}...` : item.title,
        kind: 'item',
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        item,
      });

      for (const [tag] of topTags) {
        if (item.tags.includes(tag)) {
          builtEdges.push({ from: `tag:${tag}`, to: `item:${item.id}` });
        }
      }
    });

    return {
      nodes: builtNodes,
      edges: builtEdges,
      tagClusters: new Map(topTags),
    };
  }, [activeItems]);

  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const activeClusterItems = selectedTag
    ? tagClusters.get(selectedTag) || []
    : [];

  return (
    <div className="map-card">
      <div className="map-head">
        <div>
          <strong style={{ fontSize: '0.92rem' }}>
            Auto-linked knowledge map
          </strong>
          <p className="section-meta" style={{ margin: '2px 0 0' }}>
            Click any topic hub to inspect its connected saves and turn the
            cluster into a Cloud Gemini plan.
          </p>
        </div>

        {selectedTag && activeClusterItems.length >= 2 && (
          <button
            type="button"
            className="btn btn-cloud"
            disabled={synthesizing}
            onClick={() => onSynthesizeCluster(activeClusterItems)}
          >
            <Cloud size={14} />
            {synthesizing
              ? 'Synthesizing...'
              : `Synthesize #${selectedTag} (${activeClusterItems.length})`}
          </button>
        )}
      </div>

      <div className="map-svg-wrap">
        <svg
          viewBox="0 0 840 420"
          role="img"
          aria-label="Connection map of saved tabs, notes, and screenshots"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          {edges.map((edge, idx) => {
            const a = nodeById.get(edge.from);
            const b = nodeById.get(edge.to);
            if (!a || !b) return null;
            const highlighted =
              selectedTag && edge.from === `tag:${selectedTag}`;
            return (
              <line
                key={idx}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={highlighted ? '#C25934' : '#D8CFC2'}
                strokeWidth={highlighted ? 2.2 : 1.2}
                strokeOpacity={highlighted ? 0.9 : 0.65}
              />
            );
          })}

          {nodes.map((node) => {
            if (node.kind === 'tag') {
              const rawTag = node.id.replace('tag:', '');
              const isSelected = selectedTag === rawTag;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedTag(isSelected ? null : rawTag);
                    setSelectedItem(null);
                  }}
                >
                  <circle
                    r={isSelected ? 26 : 22}
                    fill={isSelected ? '#C25934' : '#FAF8F4'}
                    stroke={isSelected ? '#C25934' : '#1C1917'}
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fontSize="11"
                    fontWeight="700"
                    fill={isSelected ? '#FFFFFF' : '#1C1917'}
                  >
                    {node.label}
                  </text>
                </g>
              );
            }

            const item = node.item!;
            const inCluster =
              selectedTag ? item.tags.includes(selectedTag) : false;
            const isPicked = selectedItem?.id === item.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedItem(item);
                  setSelectedTag(null);
                }}
              >
                <rect
                  x={-84}
                  y={-18}
                  width={168}
                  height={36}
                  rx={18}
                  fill={isPicked || inCluster ? '#E8F3ED' : '#FFFFFF'}
                  stroke={
                    isPicked
                      ? '#1F5C41'
                      : inCluster
                        ? '#C25934'
                        : '#D4CAB9'
                  }
                  strokeWidth={isPicked || inCluster ? 2 : 1.2}
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize="11"
                  fontWeight="600"
                  fill="#1C1917"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedItem && (
        <div className="map-detail">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>{selectedItem.title}</strong>
            {selectedItem.isPrivate && (
              <span className="tag tag-private">
                <Lock size={10} style={{ marginRight: 3 }} />
                Private
              </span>
            )}
          </div>
          <p className="shelf-card-summary" style={{ marginTop: 4 }}>
            {selectedItem.summary}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', fontWeight: 600 }}>
            Next step: {selectedItem.nextAction}
          </p>
        </div>
      )}
    </div>
  );
}
