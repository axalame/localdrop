import { useState, useEffect } from 'react';
import { isTauri } from '../services/api';

interface UseTauriNativeDropOptions {
  onDropPaths: (paths: string[]) => void;
}

export function useTauriNativeDrop({ onDropPaths }: UseTauriNativeDropOptions) {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/webviewWindow')
      .then(({ getCurrentWebviewWindow }) => {
        return getCurrentWebviewWindow().onDragDropEvent((event) => {
          if (event.payload.type === 'enter' || event.payload.type === 'over') {
            setIsDragging(true);
          } else if (event.payload.type === 'leave') {
            setIsDragging(false);
          } else if (event.payload.type === 'drop') {
            setIsDragging(false);
            const droppedPaths = (event.payload as { paths?: string[] }).paths;
            if (droppedPaths && Array.isArray(droppedPaths) && droppedPaths.length > 0) {
              onDropPaths(droppedPaths);
            }
          }
        });
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.warn('Native drag & drop setup failed:', err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, [onDropPaths]);

  return { isDragging, setIsDragging };
}
