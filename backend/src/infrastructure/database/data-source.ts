import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SessionEntity } from '../../modules/auth/entities/session.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { CandidateProfileEntity } from '../../modules/candidate/entities/candidate-profile.entity';
import { ResumeEntity } from '../../modules/resumes/entities/resume.entity';
import { ResumeSkillEntity } from '../../modules/resumes/entities/resume-skill.entity';
import { ResumeExperienceEntity } from '../../modules/resumes/entities/resume-experience.entity';
import { ResumeEducationEntity } from '../../modules/resumes/entities/resume-education.entity';
import { ResumeProjectEntity } from '../../modules/resumes/entities/resume-project.entity';
import { ResumeCertificationEntity } from '../../modules/resumes/entities/resume-certification.entity';
import { CreateUsersTable1787144227927 } from '../../../migrations/1787144227927-CreateUsersTable';
import { CreateSessionsTableAndAddedNameToUserEntityDateTables1787151177780 } from '../../../migrations/1787151177780-CreateSessionsTableAndAddedNameToUserEntityDateTables';
import { FixEmailVerifiedAtColumnTypo1787152000000 } from '../../../migrations/1787152000000-FixEmailVerifiedAtColumnTypo';
import { AddSessionsIndexes1787222400000 } from '../../../migrations/1787222400000-AddSessionsIndexes';
import { CreateCandidateProfiles1787308800000 } from '../../../migrations/1787308800000-CreateCandidateProfiles';
import { CreateResumes1787395200000 } from '../../../migrations/1787395200000-CreateResumes';
import { CreateStructuredResumeTables1787481600000 } from '../../../migrations/1787481600000-CreateStructuredResumeTables';
import { AddResumesApprovedAt1787568000000 } from '../../../migrations/1787568000000-AddResumesApprovedAt';
import { AddDefaultResumeToCandidateProfiles1787654400000 } from '../../../migrations/1787654400000-AddDefaultResumeToCandidateProfiles';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    UserEntity,
    SessionEntity,
    CandidateProfileEntity,
    ResumeEntity,
    ResumeSkillEntity,
    ResumeExperienceEntity,
    ResumeEducationEntity,
    ResumeProjectEntity,
    ResumeCertificationEntity,
  ],
  migrations: [
    CreateUsersTable1787144227927,
    CreateSessionsTableAndAddedNameToUserEntityDateTables1787151177780,
    FixEmailVerifiedAtColumnTypo1787152000000,
    AddSessionsIndexes1787222400000,
    CreateCandidateProfiles1787308800000,
    CreateResumes1787395200000,
    CreateStructuredResumeTables1787481600000,
    AddResumesApprovedAt1787568000000,
    AddDefaultResumeToCandidateProfiles1787654400000,
  ],
  synchronize: false,
  ssl: false,
});
