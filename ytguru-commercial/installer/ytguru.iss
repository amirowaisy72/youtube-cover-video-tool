; YT Guru installer — Inno Setup draft (Phase 1).
; Compile on the Windows build machine / GitHub Actions
; windows-latest runner:  iscc ytguru.iss
; Produces YT-Guru-Setup-<version>.exe.
;
; TODO (Phase 2, first real build):
; - Decide PrivilegesRequired: "lowest" (per-user, no UAC prompt,
;   friendlier) vs admin. Lowest is drafted here; the app only
;   binds localhost, so admin is not needed.
; - Decide default folder: {autopf}\YT Guru (Program Files) vs
;   {localappdata}\YT Guru. Program Files needs admin to write
;   jobs/covers next to the install; per-user %LOCALAPPDATA%
;   avoids that entirely. If PrivilegesRequired stays lowest,
;   switch DefaultDirName to {localappdata}\YT Guru.
; - Version comes from the build (define MyAppVersion on the
;   command line: iscc /DMyAppVersion=1.0.0 ytguru.iss).
; - Unsigned builds trigger Windows SmartScreen ("Windows protected
;   your PC" -> More info -> Run anyway). A code-signing
;   certificate costs money; Phase 1 ships unsigned with that note
;   in the customer instructions.

#define MyAppName "YT Guru"
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
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
DefaultDirName={autopf}\{#MyAppName}
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
; The workflow copies ffmpeg.exe / ffprobe.exe into dist\YT-Guru
; before compiling this script.
Source: "dist\YT-Guru\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Run-Setup: the file Master asked for — double-click opens the tool.
Source: "Run-Setup.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\Run-Setup.bat"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\Run-Setup.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
; Offer to open the tool when setup finishes.
Filename: "{app}\Run-Setup.bat"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
