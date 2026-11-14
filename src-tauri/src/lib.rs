mod db;

use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let pool = tauri::async_runtime::block_on(db::init_pool(app.handle()))
                .map_err(std::io::Error::other)?;
            app.manage(db::AppState::new(pool));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            db::initialize,
            db::get_settings,
            db::save_business,
            db::login,
            db::get_products,
            db::save_product,
            db::download_image_from_url,
            db::delete_product,
            db::create_transaction,
            db::get_expenses,
            db::add_expense,
            db::get_finance_summary,
            db::get_report_data,
            db::get_report_export_data,
            db::get_scanner_info,
            db::save_settings,
            db::rotate_scanner_token,
            db::set_scanner_active
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
