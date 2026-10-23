; 可选的全新安装 / 完全卸载：由用户在安装选项页、卸载选项页中决定是否删除 ~/.dev-sidecar。
; 默认都不删除，只有用户明确勾选时才清理用户配置、CA 证书与日志。
; 由 electron-builder 的 nsis.include 引入，安装器与卸载器都包含本文件。

!include "LogicLib.nsh"
!include "MUI2.nsh"
!include "nsDialogs.nsh"

; 删除 ~/.dev-sidecar。进程退出后日志句柄可能短暂占用文件，因此失败时重试。
!macro DS_DELETE_DEV_SIDECAR_HOME
  Push $0
  StrCpy $0 0
  ${Do}
    RMDir /r "$PROFILE\.dev-sidecar"
    ${IfNot} ${FileExists} "$PROFILE\.dev-sidecar\*.*"
      DetailPrint "已删除 $PROFILE\.dev-sidecar"
      ${ExitDo}
    ${EndIf}
    ${If} $0 >= 3
      DetailPrint "警告：$PROFILE\.dev-sidecar 仍被占用，未能完全删除"
      ${ExitDo}
    ${EndIf}
    IntOp $0 $0 + 1
    Sleep 500
  ${Loop}
  Pop $0
!macroend

!ifndef BUILD_UNINSTALLER
  Var /GLOBAL dsDeleteUserDataOnInstall
  Var /GLOBAL dsDeleteUserDataCheckbox

  ; 每次安装都显示该页：升级时默认保留数据，但允许用户主动选择全新安装。
  Function dsInstallOptionsPageCreate
    !insertmacro MUI_HEADER_TEXT "安装选项" "选择如何处理已有的用户数据"

    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 24u "dev-sidecar 把配置、CA 证书和日志保存在 $PROFILE\.dev-sidecar。"
    Pop $0
    ${NSD_CreateLabel} 0 26u 100% 34u "默认保留该目录，安装后沿用原有配置。只有希望以默认配置重新开始（全新安装）时才勾选下面的选项。"
    Pop $0
    ${NSD_CreateCheckbox} 0 70u 100% 12u "删除已有的 .dev-sidecar 目录，丢弃旧配置与证书"
    Pop $dsDeleteUserDataCheckbox
    ${NSD_SetState} $dsDeleteUserDataCheckbox ${BST_UNCHECKED}

    nsDialogs::Show
  FunctionEnd

  Function dsInstallOptionsPageLeave
    ${NSD_GetState} $dsDeleteUserDataCheckbox $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $dsDeleteUserDataOnInstall "1"
    ${Else}
      StrCpy $dsDeleteUserDataOnInstall "0"
    ${EndIf}
  FunctionEnd

  !macro customPageAfterChangeDir
    Page custom dsInstallOptionsPageCreate dsInstallOptionsPageLeave
  !macroend

  ; 静默安装不会显示选择页，变量保持 "0"，即默认保留。
  !macro customInstall
    ${If} $dsDeleteUserDataOnInstall == "1"
      !insertmacro DS_DELETE_DEV_SIDECAR_HOME
    ${EndIf}
  !macroend
!else
  Var /GLOBAL dsDeleteUserDataOnUninstall
  Var /GLOBAL dsDeleteUserDataCheckboxUn

  ; 卸载器欢迎页换成「卸载选项」页：默认保留用户数据，勾选即彻底卸载。
  ; 升级时卸载器以 /S --updated 静默调用，不会显示本页，变量保持默认值 0（保留数据）。
  Function un.dsUninstallOptionsPageCreate
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 30u "卸载完成后，是否一并删除 dev-sidecar 的用户数据？"
    Pop $0
    ${NSD_CreateLabel} 0 34u 100% 40u "$PROFILE\.dev-sidecar 中保存着代理配置、CA 证书、日志和运行状态。勾选下面的选项将删除该目录，完成彻底卸载；不勾选则保留，便于以后重装继续使用。"
    Pop $0
    ${NSD_CreateCheckbox} 0 86u 100% 12u "同时删除 .dev-sidecar 目录，完成彻底卸载"
    Pop $dsDeleteUserDataCheckboxUn
    ${NSD_SetState} $dsDeleteUserDataCheckboxUn ${BST_UNCHECKED}

    nsDialogs::Show
  FunctionEnd

  Function un.dsUninstallOptionsPageLeave
    ${NSD_GetState} $dsDeleteUserDataCheckboxUn $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $dsDeleteUserDataOnUninstall "1"
    ${Else}
      StrCpy $dsDeleteUserDataOnUninstall "0"
    ${EndIf}
  FunctionEnd

  !macro customUnWelcomePage
    UninstPage custom un.dsUninstallOptionsPageCreate un.dsUninstallOptionsPageLeave
  !macroend

  ; 静默卸载不会显示选项页，变量保持 "0"，即默认保留。
  !macro customUnInstall
    ${If} $dsDeleteUserDataOnUninstall == "1"
      !insertmacro DS_DELETE_DEV_SIDECAR_HOME
    ${EndIf}
  !macroend
!endif
