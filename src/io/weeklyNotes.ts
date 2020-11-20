import type { Moment } from "moment";
import { Notice, TFile } from "obsidian";

import { getNotePath } from "src/io/path";
import { getWeeklyNoteSettings, ISettings } from "src/settings";
import { createConfirmationDialog } from "src/ui/modal";

import { getTemplateContents } from "./dailyNotes";

export async function createWeeklyNote(
  date: Moment,
  settings: ISettings
): Promise<TFile> {
  const { vault } = window.app;
  const { template, format, folder } = getWeeklyNoteSettings(settings);
  const templateContents = await getTemplateContents(template);
  const filename = date.format(format);
  const normalizedPath = getNotePath(folder, filename);

  try {
    const createdFile = await vault.create(
      normalizedPath,
      templateContents
        .replace(
          /{{\s*(date|time)\s*:(.*?)}}/gi,
          (_, timeOrDate, momentFormat) => {
            return date.format(momentFormat.trim());
          }
        )
        .replace(/{{\s*title\s*}}/gi, filename)
        .replace(
          /{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi,
          (_, dayOfWeek, momentFormat) => {
            return date.day(dayOfWeek).format(momentFormat.trim());
          }
        )
    );
    return createdFile;
  } catch (err) {
    console.error(`Failed to create file: '${normalizedPath}'`, err);
    new Notice("Unable to create new file.");
  }
}

/**
 * Create a Weekly Note for a given date.
 */
export async function tryToCreateWeeklyNote(
  date: Moment,
  inNewSplit: boolean,
  settings: ISettings,
  cb?: () => void
): Promise<void> {
  const { workspace } = window.app;
  const { format } = getWeeklyNoteSettings(settings);
  const filename = date.format(format);

  const createFile = async () => {
    const dailyNote = await createWeeklyNote(date, settings);
    const leaf = inNewSplit
      ? workspace.splitActiveLeaf()
      : workspace.getUnpinnedLeaf();

    await leaf.openFile(dailyNote);
    cb?.();
  };

  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "Create",
      onAccept: createFile,
      text: `File ${filename} does not exist. Would you like to create it?`,
      title: "New Daily Note",
    });
  } else {
    await createFile();
  }
}