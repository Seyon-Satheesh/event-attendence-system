use sea_orm_migration::prelude::*;

use super::m20221231_000001_create_roles_table::Role;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(User::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(User::FirstName).string().not_null())
                    .col(ColumnDef::new(User::LastName).string().not_null())
                    .col(ColumnDef::new(User::Username).string().not_null().unique_key())
                    .col(ColumnDef::new(User::Email).string().not_null().unique_key())
                    .col(ColumnDef::new(User::Password).string().not_null())
                    .col(ColumnDef::new(User::Grade).integer())
                    .col(ColumnDef::new(User::Verified).boolean().not_null().default(false))
                    .col(ColumnDef::new(User::Points).integer().not_null().default(0))
                    .col(ColumnDef::new(User::Role).integer().not_null().default(0))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-user-role_id")
                            .from(User::Table, User::Role)
                            .to(Role::Table, Role::Id),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await
    }
}

/// Learn more at https://docs.rs/sea-query#iden
#[derive(Iden)]
pub enum User {
    Table,
    Id,
    FirstName,
    LastName,
    Username,
    Email,
    Password,
    Grade,
    Verified,
    Points,
    Role,
}
