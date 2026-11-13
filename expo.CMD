@SETLOCAL
@IF NOT DEFINED NODE_PATH (
  @SET "NODE_PATH=C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\expo@58.0.25_@babel+core@7._6ad24dcc694dfc32599b3f1cf4f40ee4\node_modules\expo\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\expo@58.0.25_@babel+core@7._6ad24dcc694dfc32599b3f1cf4f40ee4\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\node_modules"
) ELSE (
  @SET "NODE_PATH=C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\expo@58.0.25_@babel+core@7._6ad24dcc694dfc32599b3f1cf4f40ee4\node_modules\expo\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\expo@58.0.25_@babel+core@7._6ad24dcc694dfc32599b3f1cf4f40ee4\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\node_modules;%NODE_PATH%"
)
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\.pnpm\expo@58.0.25_@babel+core@7._6ad24dcc694dfc32599b3f1cf4f40ee4\node_modules\expo\bin\cli" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\.pnpm\expo@58.0.25_@babel+core@7._6ad24dcc694dfc32599b3f1cf4f40ee4\node_modules\expo\bin\cli" %*
)
