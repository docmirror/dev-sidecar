!macro customUnInit
  MessageBox MB_OK "卸载前请务必手动退出DevSidecar之后,再进行下一步(如果已经退出请忽略)"
  ExecWait '"$INSTDIR\resources\extra\sysproxy.exe" set 1'
!macroend
