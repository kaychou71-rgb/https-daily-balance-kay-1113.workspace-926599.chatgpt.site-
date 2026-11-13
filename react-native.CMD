@SETLOCAL
@IF NOT DEFINED NODE_PATH (
  @SET "NODE_PATH=C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\react-native@0.88.1_@babel+_18253863194e975e4693c0ead4253aaf\node_modules\react-native\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\react-native@0.88.1_@babel+_18253863194e975e4693c0ead4253aaf\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\node_modules"
) ELSE (
  @SET "NODE_PATH=C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\react-native@0.88.1_@babel+_18253863194e975e4693c0ead4253aaf\node_modules\react-native\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\react-native@0.88.1_@babel+_18253863194e975e4693c0ead4253aaf\node_modules;C:\Users\USER\Desktop\kay\daily-balance-ios\node_modules\.pnpm\node_modules;%NODE_PATH%"
)
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\..\.pnpm\react-native@0.88.1_@babel+_18253863194e975e4693c0ead4253aaf\node_modules\react-native\cli.js" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\..\.pnpm\react-native@0.88.1_@babel+_18253863194e975e4693c0ead4253aaf\node_modules\react-native\cli.js" %*
)
