; YT Guru installer — Inno Setup (v1.0.0).
; Compile on the Windows build machine / GitHub Actions
; windows-latest runner from the REPO ROOT:
;   iscc /DMyAppVersion=1.0.0 /DAppSrc="<repo root>" ytguru-commercial/installer/ytguru.iss
; Produces YT-Guru-Setup-<version>.exe in installer-output/
; (next to this script).
;
; Notes:
; - PrivilegesRequired=lowest (per-user, no UAC prompt) with
;   DefaultDirName={localappdata}\YT Guru: the app writes its
;   jobs/covers/license.json next to the install, which Program
;   Files would not allow without admin. The customer still
;   picks the folder in the wizard (directory page on).
; - AppSrc is the repo root (passed on the command line): the
;   PyInstaller output lives at <root>\dist\YT-Guru.
; - Unsigned builds trigger Windows SmartScreen ("Windows
;   protected your PC" -> More info -> Run anyway). A code-signing
;   certificate costs money; v1.0.0 ships unsigned with that note
;   in the customer instructions.

#define MyAppName "YT Guru"
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#ifndef AppSrc
  #define AppSrc "."
#endif
#define MyAppPublisher "YT Guru"
#define MyAppURL "https://github.com/amirowaisy72/youtube-cover-video-tool"

[Setup]
AppId={{3F2A1B4C-7D8E-4A1B-9C2D-5E6F7A8B9C0D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
; The customer picks the folder in the wizard (directory page on).
DefaultDirName={localappdata}\{#MyAppName}
DisableDirPage=no
; Per-user install: no UAC prompt, friendlier for customers.
PrivilegesRequired=lowest
OutputDir=installer-output
OutputBaseFilename=YT-Guru-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
; The tool needs nothing else installed: Python, pip packages and
; FFmpeg are all bundled inside the app folder by PyInstaller.
; Internet is only needed for the license check and for YouTube.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; PyInstaller --onedir output (dist\YT-Guru\*) + bundled FFmpeg.
; AppSrc is the repo root (see top of this file); the workflow
; copies ffmpeg.exe / ffprobe.exe into dist\YT-Guru first.
Source: "{#AppSrc}\dist\YT-Guru\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Run-Setup: the file Master asked for — double-click opens the tool.
Source: "Run-Setup.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\Run-Setup.bat"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\Run-Setup.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
; Offer to open the tool when setup finishes.
Filename: "{app}\Run-Setup.bat"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
