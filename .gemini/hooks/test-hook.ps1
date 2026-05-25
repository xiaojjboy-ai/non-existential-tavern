$ErrorActionPreference = "Stop"
# 写入触发信息到当前目录下的 hook-test-result.log 文件中
Add-Content -Path "hook-test-result.log" -Value "Triggered: Project-level .gemini/hooks/hooks.json at $(Get-Date)"

# 按 Hook 协议输出 JSON，且只输出这一行
[pscustomobject]@{
  hookSpecificOutput = [pscustomobject]@{
    hookEventName = "BeforeModel"
    additionalContext = "## Project Gemini Hook Active"
  }
} | ConvertTo-Json -Depth 8 -Compress
