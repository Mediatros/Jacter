import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { listen } from "@tauri-apps/api/event";
import { ProgressBar } from "../shared";
import { Button } from "../ui/Button";
import { SettingContainer } from "../ui/SettingContainer";

type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "installing"
  | "error";

interface UpdateCheckerProps {
  grouped?: boolean;
}

const UpdateChecker: React.FC<UpdateCheckerProps> = ({ grouped = false }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingUpdateRef = useRef<Update | null>(null);
  const downloadedRef = useRef(0);
  const contentLengthRef = useRef(0);
  const isBusyRef = useRef(false);

  const handleCheck = async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setStatus("checking");
    setErrorMessage(null);
    setUpdateVersion(null);
    pendingUpdateRef.current = null;

    try {
      const update = await check();
      if (update) {
        pendingUpdateRef.current = update;
        setUpdateVersion(update.version);
        setStatus("available");
      } else {
        setStatus("up-to-date");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(msg);
      setStatus("error");
    } finally {
      isBusyRef.current = false;
    }
  };

  const handleInstall = async () => {
    const update = pendingUpdateRef.current;
    if (!update || isBusyRef.current) return;
    isBusyRef.current = true;
    setStatus("downloading");
    setDownloadProgress(0);
    downloadedRef.current = 0;
    contentLengthRef.current = 0;

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          contentLengthRef.current = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloadedRef.current += event.data.chunkLength;
          if (contentLengthRef.current > 0) {
            const pct = Math.round(
              (downloadedRef.current / contentLengthRef.current) * 100,
            );
            setDownloadProgress(Math.min(pct, 100));
            if (pct >= 100) setStatus("installing");
          }
        }
      });
      await relaunch();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(msg);
      setStatus("error");
    } finally {
      isBusyRef.current = false;
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unlisten = listen("check-for-updates", handleCheck);
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const isBusy =
    status === "checking" ||
    status === "downloading" ||
    status === "installing";

  return (
    <SettingContainer
      title={t("settings.about.updates.title")}
      description={t("settings.about.updates.description")}
      grouped={grouped}
      layout="stacked"
      descriptionMode="inline"
    >
      <div className="space-y-3">
        {status !== "idle" && (
          <div className="text-sm">
            {status === "checking" && (
              <span className="text-text/60">
                {t("settings.about.updates.checking")}
              </span>
            )}
            {status === "up-to-date" && (
              <span className="text-green-500">
                {t("settings.about.updates.upToDate")}
              </span>
            )}
            {status === "available" && (
              <span className="text-logo-primary font-medium">
                {t("settings.about.updates.available", {
                  version: updateVersion,
                })}
              </span>
            )}
            {(status === "downloading" || status === "installing") && (
              <div className="flex items-center gap-3">
                <span className="text-text/60">
                  {status === "installing"
                    ? t("settings.about.updates.installing")
                    : t("settings.about.updates.downloading", {
                        progress: downloadProgress.toString().padStart(3),
                      })}
                </span>
                {status === "downloading" && downloadProgress > 0 && (
                  <ProgressBar
                    progress={[{ id: "update", percentage: downloadProgress }]}
                    size="large"
                  />
                )}
              </div>
            )}
            {status === "error" && (
              <div className="space-y-1">
                <p className="text-red-400 font-medium">
                  {t("settings.about.updates.error")}
                </p>
                <p className="text-text/60 font-mono text-xs break-all">
                  {errorMessage}
                </p>
                <p className="text-text/40 text-xs italic">
                  {t("settings.about.updates.errorHint")}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {status === "available" && (
            <Button variant="primary" size="md" onClick={handleInstall}>
              {t("settings.about.updates.installButton")}
            </Button>
          )}
          <Button
            variant="secondary"
            size="md"
            onClick={handleCheck}
            disabled={isBusy}
          >
            {t("settings.about.updates.checkButton")}
          </Button>
        </div>
      </div>
    </SettingContainer>
  );
};

export default UpdateChecker;
