import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { BusinessException } from '@/common/exceptions/business.exception';
import { ErrorCode } from '@/common/exceptions/error-code.enum';

const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const TMP_DIR = join(UPLOAD_ROOT, 'tmp');
const FILES_DIR = join(UPLOAD_ROOT, 'files');

/** 允许上传的文件扩展名白名单 */
const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'mkv',
  'mp3',
  'wav',
  'flac',
  'aac',
  'ogg',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'md',
  'csv',
  'json',
  'xml',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
]);

@Injectable()
export class UploadService {
  /** 保存单个分片 */
  async saveChunk(
    fileHash: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<{ chunkIndex: number; fileHash: string }> {
    const chunkDir = join(TMP_DIR, fileHash);
    await fs.mkdir(chunkDir, { recursive: true });
    await fs.writeFile(join(chunkDir, String(chunkIndex)), buffer);
    return { chunkIndex, fileHash };
  }

  /** 获取已上传的分片索引列表（断点续传） */
  async getUploadedChunks(fileHash: string): Promise<number[]> {
    const chunkDir = join(TMP_DIR, fileHash);
    if (!existsSync(chunkDir)) {
      return [];
    }
    const files = await fs.readdir(chunkDir);
    return files
      .map((f) => parseInt(f, 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);
  }

  /** 合并所有分片为完整文件 */
  async mergeChunks(
    fileHash: string,
    filename: string,
    totalChunks: number,
  ): Promise<{ filename: string; url: string; size: number }> {
    const chunkDir = join(TMP_DIR, fileHash);

    if (!existsSync(chunkDir)) {
      BusinessException.throw(ErrorCode.UPLOAD_CHUNK_NOT_FOUND);
    }

    // 校验分片完整性
    const uploaded = await this.getUploadedChunks(fileHash);
    if (uploaded.length !== totalChunks) {
      BusinessException.throw(ErrorCode.UPLOAD_MERGE_FAILED);
    }

    // 防止路径遍历：只取文件名部分
    const safeName = basename(filename);
    await fs.mkdir(FILES_DIR, { recursive: true });

    // 使用扩展名 + fileHash 避免重名冲突
    const ext = safeName.includes('.')
      ? safeName.split('.').pop()!.toLowerCase()
      : '';

    // 文件类型白名单校验
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      BusinessException.throw(
        ErrorCode.UPLOAD_MERGE_FAILED,
        `不支持的文件类型: .${ext}`,
      );
    }

    const finalName = ext ? `${fileHash}.${ext}` : fileHash;
    const finalPath = join(FILES_DIR, finalName);

    // 逐个写入，避免一次性占用过多内存
    const writeStream = (await import('fs')).createWriteStream(finalPath, {
      flags: 'w',
    });

    try {
      for (const index of uploaded) {
        const chunkPath = join(chunkDir, String(index));
        const data = await fs.readFile(chunkPath);
        await new Promise<void>((resolve, reject) => {
          writeStream.write(data, (err) => (err ? reject(err) : resolve()));
        });
      }
    } catch {
      BusinessException.throw(ErrorCode.UPLOAD_MERGE_FAILED);
    } finally {
      writeStream.end();
    }

    // 等待流关闭
    await new Promise<void>((resolve) =>
      writeStream.on('close', () => resolve()),
    );

    // 获取文件大小
    const stat = await fs.stat(finalPath);

    // 清理临时分片
    await fs.rm(chunkDir, { recursive: true, force: true });

    return {
      filename: safeName,
      url: `/uploads/files/${finalName}`,
      size: stat.size,
    };
  }

  /** 删除已合并的文件 */
  async deleteFile(fileHash: string): Promise<{ fileHash: string }> {
    const files = await fs.readdir(FILES_DIR);
    const target = files.find((f) => f.startsWith(fileHash));

    if (!target) {
      BusinessException.throw(ErrorCode.UPLOAD_FILE_NOT_FOUND, undefined, 404);
    }

    await fs.unlink(join(FILES_DIR, target));

    // 同时清理可能残留的临时分片
    const chunkDir = join(TMP_DIR, fileHash);
    if (existsSync(chunkDir)) {
      await fs.rm(chunkDir, { recursive: true, force: true });
    }

    return { fileHash };
  }
}
