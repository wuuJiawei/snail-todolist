#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // 在 index.html 中注入脚本，确保内容加载完成后再显示窗口
      let html = r#"
        <script>
          // 监听 DOMContentLoaded 事件
          document.addEventListener('DOMContentLoaded', () => {
            // 延迟一段时间再显示窗口，确保 React 等框架完成渲染
            setTimeout(() => {
              window.__TAURI__.window.appWindow.show();
            }, 1000);
          });
        </script>
      "#;
      
      // 将脚本注入到 index.html 中
      tauri::WebviewWindowBuilder::new(
        app,
        "main",
        tauri::WebviewUrl::App("index.html".into())
      )
      .initialization_script(html)
      .visible(false)
      .build()?;
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

// 显示主窗口的命令
#[tauri::command]
fn show_main_window(window: tauri::Window) {
  log::info!("显示主窗口");
  window.show().expect("无法显示窗口");
}
