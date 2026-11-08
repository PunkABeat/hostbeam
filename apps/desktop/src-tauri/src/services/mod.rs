//! Application/domain services: logic with no Tauri or IPC types, unit-testable
//! without an `AppHandle`, a real host, or a real clipboard. See
//! `docs/engineering/rust.md` §Module layout.

pub mod image;
pub mod ssh;
