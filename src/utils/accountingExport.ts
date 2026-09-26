import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { AccountingExport } from "../data/accountingRepository";

export async function saveAndShareAccountingExport(
  exportedDocument: AccountingExport,
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([exportedDocument.data], {
      type: exportedDocument.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = exportedDocument.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, exportedDocument.fileName);
  file.create({ overwrite: true });
  file.write(new Uint8Array(exportedDocument.data));
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  await Sharing.shareAsync(file.uri, {
    mimeType: exportedDocument.mimeType,
    dialogTitle: exportedDocument.fileName,
  });
}
