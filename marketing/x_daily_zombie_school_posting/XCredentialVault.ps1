# Runtime-only Windows Credential Manager access for the one approved X account.
# This module never writes credentials or emits them to the PowerShell pipeline.
$script:XPostingCredentialTarget = 'EscapeZombieSchool-XPosting'

if (-not ('XPostingCredentialVaultNative' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class XPostingCredentialVaultNative {
  [StructLayout(LayoutKind.Sequential)] public struct FILETIME { public uint Low; public uint High; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CREDENTIAL {
    public uint Flags; public uint Type; public IntPtr TargetName; public IntPtr Comment;
    public FILETIME LastWritten; public uint CredentialBlobSize; public IntPtr CredentialBlob;
    public uint Persist; public uint AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, uint type, uint flags, out IntPtr credential);
  [DllImport("advapi32.dll", SetLastError=false)] public static extern void CredFree(IntPtr credential);
}
'@
}

function Get-XPostingVaultCredential([ref]$Credential) {
  [IntPtr]$pointer = [IntPtr]::Zero
  if (-not [XPostingCredentialVaultNative]::CredRead($script:XPostingCredentialTarget, 1, 0, [ref]$pointer)) {
    $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw "Required Windows Credential Manager entry '$script:XPostingCredentialTarget' is unavailable (Win32 $code)."
  }
  try {
    $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($pointer, [type][XPostingCredentialVaultNative+CREDENTIAL])
    if ($credential.CredentialBlobSize -lt 2 -or ($credential.CredentialBlobSize % 2) -ne 0 -or $credential.CredentialBlobSize -gt 4096) { throw 'Stored X credential blob has an invalid size.' }
    $bytes = [byte[]]::new([int]$credential.CredentialBlobSize)
    [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob, $bytes, 0, $bytes.Length)
    try {
      $password = [Text.Encoding]::Unicode.GetString($bytes).TrimEnd([char]0)
      $username = [Runtime.InteropServices.Marshal]::PtrToStringUni($credential.UserName)
      if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrEmpty($password)) { throw 'Stored X credential entry is incomplete.' }
      $Credential.Value = [pscustomobject]@{ Username=$username; Password=$password }
    } finally { [Array]::Clear($bytes,0,$bytes.Length) }
  } finally { [XPostingCredentialVaultNative]::CredFree($pointer) }
}
