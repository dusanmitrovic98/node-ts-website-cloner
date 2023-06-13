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
