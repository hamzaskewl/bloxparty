-- AudioManager.lua
-- Place in ServerScriptService
-- Manages sequential playlist playback of pre-uploaded audio assets at the concert stage

local SoundService = game:GetService("SoundService")

-- Pre-upload audio to Roblox and paste asset IDs here
-- To upload: Create > Audio Assets in Roblox Studio, or use the Asset Manager
local PLAYLIST = {
	-- { id = "rbxassetid://123456789", name = "Track 1 - Artist Name" },
	-- { id = "rbxassetid://987654321", name = "Track 2 - Artist Name" },
}

-- Reference to the Sound object at the concert stage
-- Create a Part with a Sound child at your stage location in Workspace
local stagePart = workspace:FindFirstChild("ConcertStage")
local stageSound = stagePart and stagePart:FindFirstChildOfClass("Sound")

if not stageSound then
	-- Create a fallback sound in SoundService (plays globally)
	stageSound = Instance.new("Sound")
	stageSound.Name = "ConcertAudio"
	stageSound.Volume = 0.8
	stageSound.RollOffMode = Enum.RollOffMode.InverseTapered
	stageSound.RollOffMaxDistance = 150
	stageSound.Parent = SoundService
	print("[AudioManager] Created fallback Sound in SoundService")
end

local currentIndex = 0

local function playNext()
	if #PLAYLIST == 0 then
		print("[AudioManager] No tracks in playlist. Add asset IDs to the PLAYLIST table.")
		return
	end

	currentIndex = currentIndex + 1
	if currentIndex > #PLAYLIST then
		currentIndex = 1 -- Loop playlist
	end

	local track = PLAYLIST[currentIndex]
	stageSound.SoundId = track.id
	stageSound:Play()
	print("[AudioManager] Now playing: " .. track.name)
end

-- When a track ends, play the next one
stageSound.Ended:Connect(function()
	task.wait(1) -- Brief pause between tracks
	playNext()
end)

-- Start playlist on server start
if #PLAYLIST > 0 then
	playNext()
else
	print("[AudioManager] Playlist is empty. Upload audio assets and add IDs to the PLAYLIST table.")
end

print("[AudioManager] Audio manager loaded. " .. #PLAYLIST .. " tracks in playlist.")
