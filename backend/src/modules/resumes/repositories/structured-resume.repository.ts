import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResumeCertificationEntity } from '../entities/resume-certification.entity';
import { ResumeEducationEntity } from '../entities/resume-education.entity';
import { ResumeExperienceEntity } from '../entities/resume-experience.entity';
import { ResumeProjectEntity } from '../entities/resume-project.entity';
import { ResumeSkillEntity } from '../entities/resume-skill.entity';
import type { StructuredResume } from '../schemas/structured-resume.schema';

@Injectable()
export class StructuredResumeRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Replaces all structured rows for a resume atomically. */
  async replaceAllForResume(
    resumeId: string,
    data: StructuredResume,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const skillRepo = manager.getRepository(ResumeSkillEntity);
      const experienceRepo = manager.getRepository(ResumeExperienceEntity);
      const educationRepo = manager.getRepository(ResumeEducationEntity);
      const projectRepo = manager.getRepository(ResumeProjectEntity);
      const certificationRepo = manager.getRepository(
        ResumeCertificationEntity,
      );

      await skillRepo.delete({ resumeId });
      await experienceRepo.delete({ resumeId });
      await educationRepo.delete({ resumeId });
      await projectRepo.delete({ resumeId });
      await certificationRepo.delete({ resumeId });

      if (data.skills.length > 0) {
        await skillRepo.save(
          data.skills.map((s) => skillRepo.create({ resumeId, ...s })),
        );
      }
      if (data.experience.length > 0) {
        await experienceRepo.save(
          data.experience.map((e) =>
            experienceRepo.create({
              resumeId,
              company: e.company,
              title: e.title,
              startDate: e.startDate ?? null,
              endDate: e.endDate ?? null,
              description: null,
              achievements: e.bullets,
            }),
          ),
        );
      }
      if (data.education.length > 0) {
        await educationRepo.save(
          data.education.map((e) => educationRepo.create({ resumeId, ...e })),
        );
      }
      if (data.projects.length > 0) {
        await projectRepo.save(
          data.projects.map((p) => projectRepo.create({ resumeId, ...p })),
        );
      }
      if (data.certifications.length > 0) {
        await certificationRepo.save(
          data.certifications.map((c) =>
            certificationRepo.create({ resumeId, ...c }),
          ),
        );
      }
    });
  }
}
