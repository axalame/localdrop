import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useMobileState } from '../hooks/useMobileState';
import { MobileHeader } from './mobile/MobileHeader';
import { MobileIncomingClipboard } from './mobile/MobileIncomingClipboard';
import { MobileSendClipboard } from './mobile/MobileSendClipboard';
import { MobileFileUploader } from './mobile/MobileFileUploader';
import { MobileShortcutGuide } from './mobile/MobileShortcutGuide';
import { MobileHistoryFeed } from './mobile/MobileHistoryFeed';
import { MobileImageModal } from './mobile/MobileImageModal';

export const MobileView: React.FC = () => {
  const {
    activeClipboard,
    sendText,
    setSendText,
    connected,
    wasKicked,
    setWasKicked,
    copiedSuccess,
    sentSuccess,
    uploading,
    uploadProgress,
    uploadMessage,
    history,
    showShortcutGuide,
    setShowShortcutGuide,
    previewImage,
    setPreviewImage,
    fileInputRef,
    loadInitialData,
    handleCopyToIphone,
    handleSendToWindows,
    handlePasteFromIphone,
    handleFileUpload,
  } = useMobileState();

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white pb-20 touch-pan-y">
      <MobileHeader connected={connected} onRefresh={loadInitialData} />

      <main className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {wasKicked && (
          <div className="bg-rose-950/60 border border-rose-800/80 rounded-2xl p-4 text-xs text-rose-200 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Устройство было отключено с ПК</span>
            </div>
            <p>Оператор на компьютере разорвал соединение.</p>
            <button
              onClick={() => {
                setWasKicked(false);
                loadInitialData();
              }}
              className="mt-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-center cursor-pointer"
            >
              Подключиться снова
            </button>
          </div>
        )}

        <MobileIncomingClipboard
          activeClipboard={activeClipboard}
          copiedSuccess={copiedSuccess}
          onCopyToIphone={handleCopyToIphone}
        />

        <MobileSendClipboard
          sendText={sendText}
          sentSuccess={sentSuccess}
          onSendTextChange={setSendText}
          onPasteFromIphone={handlePasteFromIphone}
          onSendToWindows={handleSendToWindows}
        />

        <MobileFileUploader
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadMessage={uploadMessage}
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
        />

        <MobileShortcutGuide
          isOpen={showShortcutGuide}
          onToggle={() => setShowShortcutGuide((prev) => !prev)}
        />

        <MobileHistoryFeed
          history={history}
          onPreviewImage={setPreviewImage}
        />
      </main>

      <MobileImageModal
        previewImage={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default MobileView;
