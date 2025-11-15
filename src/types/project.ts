// src/types/project.ts
export type ProjectType = 
  | 'DRAFT_PROJECT'
  | 'STANDARD_PROJECT' 
  | 'TEAM_PROJECT'
  | 'RESEARCH_PROJECT';

export type ProjectStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'FINALIZING'
  | 'RECRUITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'FAILED';

export type FormattingStatus =
  | 'NOT_STARTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface Project {
  id: string;
  title: string;
  description?: string;
  content?: string;
  projectType: ProjectType;
  status: ProjectStatus;
  
  // AI格式化相关
  aiFormattedContent?: string;
  formattingStatus: FormattingStatus;
  formattingTemplate?: string;
  formattingHistory?: any;
  
  // 评审流程相关
  currentReviewRound: number;
  maxReviewRounds: number;
  allowPublicComments: boolean;
  
  // 其他现有字段
  ownerId: string;
  visibility: 'PRIVATE' | 'TEAM' | 'PUBLIC';
  knowledgeSourceId?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  
  // 关系字段
  owner?: User;
  projectMembers?: ProjectMember[];
  projectComments?: ProjectComment[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  updatedAt: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  status: 'ACTIVE' | 'DELETED' | 'HIDDEN';
  user?: User;
}