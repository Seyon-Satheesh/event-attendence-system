use sea_orm_migration::prelude::*;

use super::m20221231_000002_create_users_table::User;
use super::m20230226_000003_create_events_table::Event;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Host::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Host::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Host::Event).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-host-event_id")
                            .from(Host::Table, Host::Event)
                            .to(Event::Table, Event::Id),
                    )
                    .col(ColumnDef::new(Host::User).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-host-user_id")
                            .from(Host::Table, Host::User)
                            .to(User::Table, User::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Host::Table).to_owned())
            .await
    }
}

/// Learn more at https://docs.rs/sea-query#iden
#[derive(Iden)]
pub enum Host {
    Table,
    Id,
    Event,
    User,
}
