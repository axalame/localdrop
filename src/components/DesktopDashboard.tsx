import React, { useEffect } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import { useWindowPaste } from '../hooks/useWindowPaste';
import { useTauriNativeDrop } from '../hooks/useTauriNativeDrop';
import { Header } from './dashboard/Header';
import { QrCard } from './dashboard/QrCard';
import { ClipboardCard } from './dashboard/ClipboardCard';
import { DropZone } from './dashboard/DropZone';
import { HistoryFeed } from './dashboard/HistoryFeed';
import { ImagePreviewModal } from './dashboard/ImagePreviewModal';
import { DevicesModal } from './dashboard/DevicesModal';

export interface DesktopDashboardProps {
  onSwitchToMobile?: () => void;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ onSwitchToMobile }) => {
  const {
    status,
    history,
    qrSvg,
    manualText,
    setManualText,
    filter,
    setFilter,
    search,
    setSearch,
    copiedLink,
    copiedItem,
    uploadStatus,
    showDevicesModal,
    setShowDevicesModal,
    showIpDropdown,
    setShowIpDropdown,
    previewImage,
    setPreviewImage,
    loadData,
    handleCopyText,
    handleCopyLink,
    handleSendManualText,
    handleClearHistory,
    handleOpenFolder,
    handleOpenFile,
    handleOpenLink,
    handleSelectIp,
    handleDisconnectClient,
    handleDisconnectAll,
    handleFileUpload,
    handlePasteFromClipboard,
    handleNativeDroppedFiles,
  } = useDashboardState();

  const { isDragging, setIsDragging } = useTauriNativeDrop({
    onDropPaths: handleNativeDroppedFiles,
  });

  useWindowPaste({
    onPasteScreenshot: (file) => handleFileUpload([file]),
    onPasteClipboardText: handlePasteFromClipboard,
  });

  // Keyboard shortcut: Escape to close open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
        setShowDevicesModal(false);
        setShowIpDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPreviewImage, setShowDevicesModal, setShowIpDropdown]);

  const apiBase = `http://${status.ip || '127.0.0.1'}:${status.port || 52025}`;
  const mobileUrl = `http://${status.ip}:${status.port}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Header
        currentIp={status.ip}
        port={status.port}
        availableIps={status.available_ips}
        connectedClients={status.connected_clients}
        isIpDropdownOpen={showIpDropdown}
        onToggleIpDropdown={() => setShowIpDropdown(!showIpDropdown)}
        onSelectIp={handleSelectIp}
        onOpenDevicesModal={() => setShowDevicesModal(true)}
        onRefresh={loadData}
        onSwitchToMobile={onSwitchToMobile}
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: QR Code & Clipboard Control */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <QrCard
            qrSvg={qrSvg}
            mobileUrl={mobileUrl}
            isCopiedLink={copiedLink}
            onCopyLink={handleCopyLink}
          />

          <ClipboardCard
            activeClipboard={status.active_clipboard}
            manualText={manualText}
            copiedItem={copiedItem}
            onManualTextChange={setManualText}
            onSendManualText={handleSendManualText}
            onPasteFromClipboard={handlePasteFromClipboard}
            onCopyText={handleCopyText}
            onOpenLink={handleOpenLink}
          />

          <DropZone
            isDragging={isDragging}
            uploadStatus={uploadStatus}
            onFileUpload={handleFileUpload}
            onDragStateChange={setIsDragging}
          />
        </div>

        {/* Right Column: History Feed */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <HistoryFeed
            history={history}
            filter={filter}
            search={search}
            apiBase={apiBase}
            copiedItem={copiedItem}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onOpenFolder={handleOpenFolder}
            onClearHistory={handleClearHistory}
            onPreviewImage={setPreviewImage}
            onOpenFile={handleOpenFile}
            onOpenLink={handleOpenLink}
            onCopyText={handleCopyText}
          />
        </div>
      </main>

      {/* Modals */}
      {previewImage && (
        <ImagePreviewModal
          previewImage={previewImage}
          onClose={() => setPreviewImage(null)}
          onOpenFile={handleOpenFile}
        />
      )}

      {showDevicesModal && (
        <DevicesModal
          clients={status.clients}
          onClose={() => setShowDevicesModal(false)}
          onDisconnectClient={handleDisconnectClient}
          onDisconnectAll={handleDisconnectAll}
        />
      )}
    </div>
  );
};
