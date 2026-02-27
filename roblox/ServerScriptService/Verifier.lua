-- Verifier.lua
-- Place in ServerScriptService
-- Checks if a player is whitelisted via the bloxparty API on join

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- Your deployed bloxparty API URL
local API_BASE = "https://bloxparty.up.railway.app" -- Your Railway app URL

local function checkWhitelist(player)
	local url = API_BASE .. "/api/roblox/verify?robloxUserId=" .. tostring(player.UserId)

	local success, result = pcall(function()
		return HttpService:GetAsync(url)
	end)

	if not success then
		warn("[Verifier] API request failed for " .. player.Name .. ": " .. tostring(result))
		player:Kick("Could not verify access. Please try again later.")
		return
	end

	local data = HttpService:JSONDecode(result)

	if data.verified then
		print("[Verifier] " .. player.Name .. " is verified!")
	else
		player:Kick("You are not whitelisted. Join our Discord and submit your Roblox username first!")
	end
end

Players.PlayerAdded:Connect(function(player)
	checkWhitelist(player)
end)

print("[Verifier] Whitelist verifier loaded.")
