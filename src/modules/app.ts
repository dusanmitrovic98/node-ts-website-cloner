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

  async function extractStaticResourceUrls(
    page: Page
  ): Promise<[string[], string[]]> {
    const [stylesheetUrls, scriptSrcs] = await page.evaluate(() => {
      const stylesheets = Array.from(
        document.querySelectorAll('link[rel="stylesheet"]')
      ).map((stylesheet) => (stylesheet as HTMLLinkElement).href);

      const scripts = Array.from(document.querySelectorAll("script[src]")).map(
        (script) => (script as HTMLScriptElement).src
      );

      return [stylesheets, scripts];
    });

    return [stylesheetUrls, scriptSrcs];
  }

  function createDirectory(): string {
    const directoryPath = path.join(".", ".pages", Date.now().toString());
    fs.mkdirSync(directoryPath, { recursive: true });
    console.log("Directory created successfully!");
    return directoryPath;
  }

  function saveFile(
    directoryPath: string,
    fileName: string,
    data: ArrayBuffer
  ): void {
    if (path.extname(fileName) === ".html") {
      // Update links and script src in the HTML file to use local resources
      const htmlContent = Buffer.from(data).toString("utf-8");
      const updatedScriptHtmlContent = htmlContent.replace(
        /<script src="([^"]+)"><\/script>/g,
        (match, scriptSrc) => {
          const scriptFileName = path.basename(scriptSrc);
          return `<script src="${scriptFileName}"></script>`;
        }
      );

      const updatedHtmlContent = updatedScriptHtmlContent.replace(
        /<link rel="stylesheet" href="([^"]+)">/g,
        (match, cssHref) => {
