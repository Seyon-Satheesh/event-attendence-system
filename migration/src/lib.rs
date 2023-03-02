pub use sea_orm_migration::prelude::*;

mod m20221231_000001_create_roles_table;
mod m20221231_000002_create_users_table;
mod m20230226_000003_create_events_table;
mod m20230226_000004_create_hosts_table;
mod m20230226_000005_create_registrants_table;
mod m20230301_000006_create_prizes_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20221231_000001_create_roles_table::Migration),
            Box::new(m20221231_000002_create_users_table::Migration),
            Box::new(m20230226_000003_create_events_table::Migration),
            Box::new(m20230226_000004_create_hosts_table::Migration),
            Box::new(m20230226_000005_create_registrants_table::Migration),
            Box::new(m20230301_000006_create_prizes_table::Migration)
        ]
    }
}
