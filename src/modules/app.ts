import puppeteer, { Page } from "puppeteer";
import mime from "mime-types";

import dotenv from "dotenv";
import axios from "axios";
import open from "open";
import path from "path";
import fs from "fs";

dotenv.config();

const WEBSITE_URL = process.env.WEBSITE_URL || "http://example.com";

async function app(): Promise<void> {
  let directoryPath: string = createDirectory();
  let fileName: string = "";

  async function downloadStaticResources(
    page: Page,
    directoryPath: string
  ): Promise<void> {
    const baseUrl = page.url();
    const [stylesheetUrls, scriptSrcs] = await extractStaticResourceUrls(page);

    const resourceUrls = [...stylesheetUrls, ...scriptSrcs];

    for (const resourceUrl of resourceUrls) {
      const absoluteUrl = new URL(resourceUrl, baseUrl).href;
      const fileName = path.basename(absoluteUrl);
      const fileExtension = path.extname(fileName);

      // Skip downloading if the file extension is not valid
      if (!isValidFileExtension(fileExtension)) {
        console.log(`Skipped: ${fileName}`);
        continue;
      }

      try {
        const { data } = await axios.get<ArrayBuffer>(absoluteUrl, {
          responseType: "arraybuffer",
        });

        saveFile(directoryPath, fileName, data);
        console.log(`Downloaded: ${fileName}`);
      } catch (error) {
        console.error(`Error downloading file: ${fileName}`, error);
      }
    }
  }

  function isValidFileExtension(extension: string): boolean {
    const validExtensions = [".css", ".js", ".png", ".jpg", ".jpeg", ".gif"];
    return validExtensions.includes(extension.toLowerCase());
  }
