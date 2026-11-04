import { useEffect } from 'react';

interface UseWindowPasteOptions {
  onPasteScreenshot: (file: File) => void;
  onPasteClipboardText: () => void;
}

export function useWindowPaste({ onPasteScreenshot, onPasteClipboardText }: UseWindowPasteOptions) {
  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      let hasImage = false;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            hasImage = true;
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              const ext = file.type === 'image/jpeg' ? 'jpg' : 'png';
              const screenshotFile = new File(
                [file],
                `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`,
                { type: file.type }
              );
              onPasteScreenshot(screenshotFile);
              return;
            }
          }
        }
      }

      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInput && !hasImage) {
        e.preventDefault();
        onPasteClipboardText();
      }
    };

    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  }, [onPasteScreenshot, onPasteClipboardText]);
}
