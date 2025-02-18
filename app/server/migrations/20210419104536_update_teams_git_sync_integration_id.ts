import * as Knex from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("teams", (table) => {
    table
      .string("git_sync_integration_id")
      .references("id")
      .inTable("integrations");
  });

  await knex.schema.alterTable("tests", (table) => {
    table.string("creator_id").nullable().alter();
  });

  return knex.schema.alterTable("integrations", (table) => {
    table.dropUnique(["github_repo_id", "team_id"]);
    table.unique(["github_repo_id", "team_id", "type"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("integrations", (table) => {
    table.dropUnique(["github_repo_id", "team_id", "type"]);
    table.unique(["github_repo_id", "team_id"]);
  });

  await knex.schema.alterTable("tests", (table) => {
    table.string("creator_id").notNullable().alter();
  });

  return knex.schema.alterTable("teams", (table) => {
    table.dropColumn("git_sync_integration_id");
  });
}
