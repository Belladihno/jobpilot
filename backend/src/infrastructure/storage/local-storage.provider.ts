import { Injectable } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { StorageProvider } from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(process.cwd(), rootDir);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.safePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.safePath(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.safePath(key), { force: true });
  }

  private safePath(key: string): string {
    const filePath = join(this.root, key);
    if (!filePath.startsWith(this.root)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return filePath;
  }
}
