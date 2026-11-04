import React, { useEffect } from 'react';
import { useDashboardState } from '../hooks/useDashboardState';
import { useHistoryFilter } from '../hooks/useHistoryFilter';
import { useWindowPaste } from '../hooks/useWindowPaste';
import { useTauriNativeDrop } from '../hooks/useTauriNativeDrop';
import { Header } from './dashboard/Header';
import { SidebarFilter } from './dashboard/SidebarFilter';
import { QrCard } from './dashboard/QrCard';
import { ClipboardCard } from './dashboard/ClipboardCard';
import { DropZone } from './dashboard/DropZone';
import { HistoryFeed } from './dashboard/HistoryFeed';
import { ImagePreviewModal } from './dashboard/ImagePreviewModal';
import { DevicesModal } from './dashboard/DevicesModal';
import { isTauri } from '../services/api';

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
    copiedLink,
    copiedItem,
    uploadStatus,
    showDevicesModal,
    setShowDevicesModal,
    showIpDropdown,
    setShowIpDropdown,
    previewImage,
    setPreviewImage,
    isEncrypted,
    loadData,
    handleCopyText,
    handleCopyLink,
    handleSendManualText,
    handleToggleFavorite,
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

  const {
    activeCategory,
    selectedType,
    selectedTag,
    selectedSource,
    selectedTime,
    search,
    setSearch,
    counts,
    availableSources,
    filteredHistory,
    handleSelectCategory,
    handleSelectType,
    handleSelectTag,
    handleSelectSource,
    handleSelectTime,
  } = useHistoryFilter(history, status.clients);

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

  const apiBase = isTauri ? `http://${status.ip || '127.0.0.1'}:${status.port || 52025}` : '';
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

      <main className="flex-1 p-4 sm:p-6 flex flex-col lg:flex-row gap-6 max-w-[1700px] mx-auto w-full min-h-0">
        {/* Left Column: Sidebar Grouping & Filters (Matches Screenshot) */}
        <SidebarFilter
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          selectedType={selectedType}
          onSelectType={handleSelectType}
          selectedTag={selectedTag}
          onSelectTag={handleSelectTag}
          selectedSource={selectedSource}
          onSelectSource={handleSelectSource}
          selectedTime={selectedTime}
          onSelectTime={handleSelectTime}
          counts={counts}
          availableSources={availableSources}
          isEncrypted={isEncrypted}
        />

        {/* Center Column: QR Code, Clipboard Control & DropZone */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-5 shrink-0">
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
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <HistoryFeed
            history={filteredHistory}
            search={search}
            apiBase={apiBase}
            copiedItem={copiedItem}
            onSearchChange={setSearch}
            onOpenFolder={handleOpenFolder}
            onClearHistory={handleClearHistory}
            onPreviewImage={setPreviewImage}
            onOpenFile={handleOpenFile}
            onOpenLink={handleOpenLink}
            onCopyText={handleCopyText}
            onToggleFavorite={handleToggleFavorite}
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
