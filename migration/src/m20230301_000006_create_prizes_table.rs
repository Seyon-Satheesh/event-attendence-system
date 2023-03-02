use sea_orm_migration::prelude::*;

use super::m20221231_000002_create_users_table::User;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Prize::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Prize::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Prize::MainWinner).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-prize-random_id")
                            .from(Prize::Table, Prize::MainWinner)
                            .to(User::Table, User::Id),
                    )
                    .col(ColumnDef::new(Prize::Grade9Winner).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-prize-grade9_id")
                            .from(Prize::Table, Prize::Grade9Winner)
                            .to(User::Table, User::Id),
                    )
                    .col(ColumnDef::new(Prize::Grade10Winner).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-prize-grade10_id")
                            .from(Prize::Table, Prize::Grade10Winner)
                            .to(User::Table, User::Id),
                    )
                    .col(ColumnDef::new(Prize::Grade11Winner).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-prize-grade11_id")
                            .from(Prize::Table, Prize::Grade11Winner)
                            .to(User::Table, User::Id),
                    )
                    .col(ColumnDef::new(Prize::Grade12Winner).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-prize-grade12_id")
                            .from(Prize::Table, Prize::Grade12Winner)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Prize::Table).to_owned())
            .await
    }
}

/// Learn more at https://docs.rs/sea-query#iden
#[derive(Iden)]
pub enum Prize {
    Table,
    Id,
    MainWinner,
    Grade9Winner,
    Grade10Winner,
    Grade11Winner,
    Grade12Winner,
}
