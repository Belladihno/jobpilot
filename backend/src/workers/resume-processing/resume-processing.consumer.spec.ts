import type { ConsumeMessage } from 'amqplib';
import { ResumeProcessingConsumer } from './resume-processing.consumer';
import { ResumeParserRegistry } from './resume-parser.registry';
import type { ResumeParser } from './parsers/resume-parser.interface';
import type { StorageProvider } from '../../infrastructure/storage/storage.provider';
import { ResumeRepository } from '../../modules/resumes/repositories/resume.repository';
import { ResumeStatus } from '../../modules/resumes/entities/resume.entity';

function message(payload: unknown): ConsumeMessage {
  const content =
    typeof payload === 'string'
      ? Buffer.from(payload)
      : Buffer.from(JSON.stringify(payload));
  return {
    content,
    fields: {},
    properties: {},
  } as unknown as ConsumeMessage;
}

describe('ResumeProcessingConsumer', () => {
  let channel: { ack: jest.Mock; prefetch: jest.Mock; consume: jest.Mock };
  let resumeRepo: {
    findById: jest.Mock;
    save: jest.Mock;
  };
  let storage: { get: jest.Mock };
  let registry: { find: jest.Mock };
  let consumer: ResumeProcessingConsumer;

  const baseResume = () => ({
    id: '11111111-1111-7111-8111-111111111111',
    userId: 'u-1',
    mimeType: 'application/pdf',
    storageKey: 'resumes/u-1/x.pdf',
    status: ResumeStatus.UPLOADED,
    extractedText: null,
    processingError: null,
  });

  beforeEach(() => {
    channel = {
      ack: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'test' }),
    };
    resumeRepo = {
      findById: jest.fn(),
      save: jest.fn((r) => Promise.resolve(r)),
    };
    storage = { get: jest.fn().mockResolvedValue(Buffer.from('%PDF fake')) };
    registry = {
      find: jest.fn().mockReturnValue({
        extract: jest.fn().mockResolvedValue('extracted text'),
      } as unknown as ResumeParser),
    };

    const connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
    };
    consumer = new ResumeProcessingConsumer(
      connection as never,
      resumeRepo as unknown as ResumeRepository,
      registry as unknown as ResumeParserRegistry,
      storage as unknown as StorageProvider,
    );
    return consumer.start();
  });

  it('extracts text and marks processed', async () => {
    const resume = baseResume();
    resumeRepo.findById.mockResolvedValue(resume);

    await consumer.handle(message({ resumeId: resume.id }));

    expect(resume.extractedText).toBe('extracted text');
    expect(resume.status).toBe(ResumeStatus.PROCESSED);
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks and discards malformed payloads', async () => {
    await consumer.handle(message('not-json{{'));

    expect(resumeRepo.findById).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('acks and discards when resume no longer exists', async () => {
    resumeRepo.findById.mockResolvedValue(null);

    await consumer.handle(
      message({ resumeId: '22222222-2222-7222-8222-222222222222' }),
    );

    expect(resumeRepo.save).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });

  it('marks failed with error when parser throws', async () => {
    const resume = baseResume();
    resumeRepo.findById.mockResolvedValue(resume);
    registry.find.mockReturnValue({
      extract: jest.fn().mockRejectedValue(new Error('corrupt pdf')),
    } as unknown as ResumeParser);

    await consumer.handle(message({ resumeId: resume.id }));

    expect(resume.status).toBe(ResumeStatus.FAILED);
    expect(resume.processingError).toBe('corrupt pdf');
    expect(channel.ack).toHaveBeenCalledTimes(1);
  });
});
