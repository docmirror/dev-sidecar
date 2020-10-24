const script = `
Function Set-InternetProxy
{
    [CmdletBinding()]
    Param(
        
        [Parameter(Mandatory=$True,ValueFromPipeline=$true,ValueFromPipelineByPropertyName=$true)]
        [String[]]$Proxy,

        [Parameter(Mandatory=$False,ValueFromPipeline=$true,ValueFromPipelineByPropertyName=$true)]
        [AllowEmptyString()]
        [String[]]$acs
                
    )

    Begin
    {

            $regKey="HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        
    }
    
    Process
    {
        
        Set-ItemProperty -path $regKey ProxyEnable -value 1

        Set-ItemProperty -path $regKey ProxyServer -value $proxy
                            
        if($acs) 
        {            
            
                 Set-ItemProperty -path $regKey AutoConfigURL -Value $acs          
        }

    } 
    
    End
    {

        Write-Output "Proxy is now enabled"

        Write-Output "Proxy Server : $proxy"

        if ($acs)
        {
            
            Write-Output "Automatic Configuration Script : $acs"

        }
        else
        {
            
            Write-Output "Automatic Configuration Script : Not Defined"

        }
    }
}

`
module.exports = script
