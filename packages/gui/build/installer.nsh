; 可选的全新安装 / 完全卸载：由用户在选择页或弹窗中决定是否删除 ~/.dev-sidecar。
; 默认都不删除，只有用户明确选择时才清理用户配置、CA 证书与日志。
; 由 electron-builder 的 nsis.include 引入，安装器与卸载器的共享头部都会包含本文件。

!include "LogicLib.nsh"
!include "MUI2.nsh"
!include "nsDialogs.nsh"

; 这些变量只服务于安装器；卸载器构建里若不声明，可避免 -WX 的「变量未使用」告警。
!ifndef BUILD_UNINSTALLER
  Var /GLOBAL dsHadPreviousInstall
  Var /GLOBAL dsInstallLocation
  Var /GLOBAL dsDeleteUserDataOnInstall
  Var /GLOBAL dsDeleteUserDataCheckbox
!endif

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
  ; 记录是否存在旧版本安装。initMultiUser 在本宏之前执行，$INSTDIR 已按历史安装位置取值。
  ; 只看 ${isUpdated} 不够：手动双击新版安装包时它不成立，但注册表里仍有旧版本记录。
  !macro customInit
    StrCpy $dsHadPreviousInstall "0"
    StrCpy $dsDeleteUserDataOnInstall "0"
    ReadRegStr $dsInstallLocation HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
    ${If} $dsInstallLocation != ""
      StrCpy $dsHadPreviousInstall "1"
    ${Else}
      ReadRegStr $dsInstallLocation HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $dsInstallLocation != ""
        StrCpy $dsHadPreviousInstall "1"
      ${EndIf}
    ${EndIf}
    ${If} ${isUpdated}
      StrCpy $dsHadPreviousInstall "1"
    ${EndIf}
  !macroend

  ; 仅全新安装时提供该选项；升级不动用户数据，因此直接跳过本页。
  Function dsInstallOptionsPageCreate
    ${If} $dsHadPreviousInstall == "1"
      Abort
    ${EndIf}

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
!endif

; 卸载时询问是否一并删除用户数据，默认「否」。
; 升级会以 --updated 调用旧卸载器，此时不询问也不删除；静默卸载同样保留。
!macro customUnInstall
  ${IfNot} ${isUpdated}
    ${IfNot} ${Silent}
      MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "是否同时删除 dev-sidecar 的用户数据？$\r$\n$\r$\n$PROFILE\.dev-sidecar 中保存着代理配置、CA 证书、日志和运行状态。$\r$\n选择「是」将删除该目录，完成完全卸载；选择「否」会保留，便于以后重装继续使用。$\r$\n$\r$\n默认选择「否」。" IDNO dsKeepUserDataOnUninstall
      !insertmacro DS_DELETE_DEV_SIDECAR_HOME
      dsKeepUserDataOnUninstall:
    ${EndIf}
  ${EndIf}
!macroend
