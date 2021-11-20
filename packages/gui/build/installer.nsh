!macro customUnInit
  MessageBox MB_OK "卸载前请务必手动右键小图标退出DevSidecar之后,再进行下一步↘↘↘↘↘↘↘↘↘"
  ExecWait '"$INSTDIR\resources\extra\sysproxy.exe" set 1'
!macroend
