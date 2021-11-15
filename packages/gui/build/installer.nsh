!macro customUnInit
  MessageBox MB_OK "请务必先手动右键小图标退出DevSidecar之后再进行下一步↘↘↘↘↘↘↘↘↘"
  ExecWait '"$INSTDIR\resources\extra\sysproxy.exe" set 1'
!macroend
