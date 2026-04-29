import { ConflictEvent } from '../entities/ConflictEvent';

export interface IConflictEventRepository {
  getAll(): Promise<ConflictEvent[]>;
}
