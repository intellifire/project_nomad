/**
 * Migration: Add User Ownership
 *
 * Adds user_id column to fire_models for model ownership tracking.
 * Nullable for backwards compatibility with existing models.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('fire_models', 'user_id');
  if (!hasColumn) {
    await knex.schema.alterTable('fire_models', (table) => {
      table.string('user_id').nullable();
    });

    // Create index for filtering by user
    try {
      await knex.schema.alterTable('fire_models', (table) => {
        table.index('user_id', 'idx_fire_models_user_id');
      });
    } catch {
      // Index might already exist
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('fire_models', 'user_id');
  if (hasColumn) {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    // For now, just drop the index if it exists
    try {
      await knex.schema.alterTable('fire_models', (table) => {
        table.dropIndex('user_id', 'idx_fire_models_user_id');
      });
    } catch {
      // Index might not exist
    }

    // Drop column (works on PostgreSQL, MySQL; SQLite needs table recreation)
    try {
      await knex.schema.alterTable('fire_models', (table) => {
        table.dropColumn('user_id');
      });
    } catch {
      console.warn('[Migration] Could not drop user_id column - may need manual cleanup on SQLite');
    }
  }
}
