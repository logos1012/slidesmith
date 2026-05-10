// container.ts — tiny dependency container for repositories (sw-eng §4-2 DIP).
// Routes import `getRepos()` and depend only on the interface types. Tests
// override via `setRepos()` with in-memory fakes; production wires Airtable + S3.
import type { IKnowledgeRepo } from './interfaces/IKnowledgeRepo.js';
import type { ITemplateRepo } from './interfaces/ITemplateRepo.js';
import type { ICarouselRepo } from './interfaces/ICarouselRepo.js';
import type { IElementRepo } from './interfaces/IElementRepo.js';
import type { IBlobStorage } from './interfaces/IBlobStorage.js';
import { AirtableKnowledgeRepo } from './airtable/AirtableKnowledgeRepo.js';
import { AirtableTemplateRepo } from './airtable/AirtableTemplateRepo.js';
import { AirtableCarouselRepo } from './airtable/AirtableCarouselRepo.js';
import { AirtableElementRepo } from './airtable/AirtableElementRepo.js';
import { S3BlobStorage } from './s3/S3BlobStorage.js';

export interface Repos {
  knowledge: IKnowledgeRepo;
  templates: ITemplateRepo;
  carousels: ICarouselRepo;
  elements: IElementRepo;
  blob: IBlobStorage;
}

let repos: Repos | null = null;

function defaultRepos(): Repos {
  return {
    knowledge: new AirtableKnowledgeRepo(),
    templates: new AirtableTemplateRepo(),
    carousels: new AirtableCarouselRepo(),
    elements: new AirtableElementRepo(),
    blob: new S3BlobStorage(),
  };
}

export function getRepos(): Repos {
  if (!repos) repos = defaultRepos();
  return repos;
}

/** Test-only: swap in fakes. */
export function setRepos(next: Partial<Repos>): void {
  repos = { ...(repos ?? defaultRepos()), ...next };
}

/** Test-only: drop overrides + clear singleton (next getRepos rebuilds defaults). */
export function _resetRepos(): void {
  repos = null;
}
