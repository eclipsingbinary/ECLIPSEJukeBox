import { loadIcons } from "./icons.js";
import { showTrackAndTokenSelectionModal, ShowTokenSelectionModal } from "./modals.js";
import { approveToken } from "./contract.js";
import { hideLoader, showLoader, resetTrackAndTokenSelectionModal } from "./utils.js";
import CustomPlayer from "./player.js";

let customPlayer = null;

export const setupPlaySongButton = async (jukeboxContract, albumName, paymentTokens, playFee, albumCID) => {
    const playSongButton = document.getElementById("play-song");
    const controlsView = document.getElementById("controls");
    const recordView = document.getElementById("record");
    const backToControlsButton = document.getElementById("back-to-controls");

    // Initialize custom player if not already initialized
    if (!customPlayer) {
        customPlayer = new CustomPlayer();
    }

    // List of IPFS gateways to try
    const ipfsGateways = [
        `https://${albumCID}.ipfs.w3s.link`,
        `https://ipfs.io/ipfs/${albumCID}`,
        `https://cloudflare-ipfs.com/ipfs/${albumCID}`,
        `https://gateway.pinata.cloud/ipfs/${albumCID}`
    ];

    // Function to try loading from multiple gateways
    const tryLoadFromGateways = async (filename) => {
        for (const gateway of ipfsGateways) {
            try {
                const trackUrl = `${gateway}/${filename}`;
                console.log(`Trying to load from: ${trackUrl}`);
                const response = await fetch(trackUrl);
                if (response.ok) {
                    const blob = await response.blob();
                    // Try to determine the content type from the filename
                    const fileExtension = filename.split('.').pop().toLowerCase();
                    let contentType = 'audio/mpeg'; // default
                    if (fileExtension === 'mp3') contentType = 'audio/mpeg';
                    else if (fileExtension === 'm4a') contentType = 'audio/mp4';
                    else if (fileExtension === 'wav') contentType = 'audio/wav';
                    else if (fileExtension === 'ogg') contentType = 'audio/ogg';
                    
                    const correctedBlob = new Blob([blob], { type: contentType });
                    return URL.createObjectURL(correctedBlob);
                }
            } catch (error) {
                console.log(`Failed to load from gateway: ${gateway}`, error);
            }
        }
        throw new Error('Failed to load track from all gateways');
    };

    playSongButton.addEventListener("click", async () => {
        try {
            // Extract the track list from the right LCD screen
            const trackRows = Array.from(document.querySelectorAll("#lcd-screen-right table tr"))
                .slice(1) // Skip the header row
                .filter((row) => {
                    const trackNameCell = row.querySelector("td:nth-child(2)");
                    return (
                        trackNameCell &&
                        trackNameCell.innerText.trim() !== "" &&
                        isNaN(trackNameCell.innerText.trim()) &&
                        !trackNameCell.innerText.toLowerCase().includes("album play price")
                    );
                });

            const trackList = trackRows.map((row) =>
                row.querySelector("td:nth-child(2)").innerText.trim()
            );

            if (trackList.length === 0) {
                alert("No tracks available to play.");
                return;
            }

            // Show the combined modal for track and token selection
            const { trackNumber, token } = await showTrackAndTokenSelectionModal(trackList, paymentTokens);

            showLoader();

            try {
                await approveToken(token, jukeboxContract.address, playFee);
            } catch (error) {
                console.error("Error approving token:", error);
                alert("Failed to approve token for spending. Please try again.");
                hideLoader();
                resetTrackAndTokenSelectionModal();
                return;
            }

            try {
                console.log(`Playing track ${trackNumber + 1} from album "${albumName}"...`);
                const tx = await jukeboxContract.playSong(albumName, trackNumber, token, {
                    gasLimit: ethers.utils.hexlify(500000),
                });

                console.log("Transaction Hash:", tx.hash);
                await tx.wait();
            } catch (error) {
                console.error("Error playing track:", error);
                hideLoader();
                resetTrackAndTokenSelectionModal();
                return;
            }

            console.log(`Track ${trackNumber + 1} is now playing! Payment successful.`);

            // Extract the track filename and try to load it
            const trackFilename = trackList[trackNumber];
            try {
                const audioUrl = await tryLoadFromGateways(trackFilename);
                customPlayer.loadTrack(audioUrl, trackFilename);
                controlsView.classList.add("hidden");
                recordView.classList.remove("hidden");
                customPlayer.play();
            } catch (error) {
                console.error("Failed to load audio:", error);
                alert("Failed to load the audio file. Please try again later.");
            }

        } catch (error) {
            console.error("Error playing track:", error);
        } finally {
            resetTrackAndTokenSelectionModal();
            hideLoader();
        }
    });

    // Handle exiting the record spin view
    backToControlsButton.addEventListener("click", () => {
        recordView.classList.add("hidden");
        controlsView.classList.remove("hidden");
        if (customPlayer) {
            customPlayer.pause();
        }
    });
};

export const setupPlayAlbumButton = (jukeboxContract, albumName, acceptedTokens, wholeAlbumFee, cid) => {
    const playAlbumButton = document.getElementById("play-album");
    const controlsView = document.getElementById("controls");
    const recordView = document.getElementById("record");
    const backToControlsButton = document.getElementById("back-to-controls");
    let currentTrackIndex = 0;
    let isPlayingAlbum = false;

    // Initialize custom player if not already initialized
    if (!customPlayer) {
        customPlayer = new CustomPlayer();
    }

    // List of IPFS gateways to try
    const ipfsGateways = [
        `https://${cid}.ipfs.w3s.link`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://gateway.pinata.cloud/ipfs/${cid}`
    ];

    playAlbumButton.addEventListener("click", async () => {
        try {
            console.log("=== Starting Album Playback ===");
            console.log(`Album: ${albumName}`);
            console.log(`CID: ${cid}`);
            console.log("Accepted tokens:", acceptedTokens);

            // Show the modal for token selection
            const { token } = await ShowTokenSelectionModal(acceptedTokens);
            console.log(`Selected token for payment: ${token}`);

            // Fetch track list
            const trackRows = Array.from(document.querySelectorAll("#lcd-screen-right table tr"))
                .slice(1)
                .filter((row) => {
                    const trackNameCell = row.querySelector("td:nth-child(2)");
                    return (
                        trackNameCell &&
                        trackNameCell.innerText.trim() !== "" &&
                        isNaN(trackNameCell.innerText.trim()) &&
                        !trackNameCell.innerText.toLowerCase().includes("album play price")
                    );
                });

            const trackList = trackRows.map((row) => row.querySelector("td:nth-child(2)").innerText.trim());

            console.log("=== Track List ===");
            trackList.forEach((track, index) => {
                console.log(`${index + 1}. ${track}`);
            });

            if (trackList.length === 0) {
                alert("No tracks available to play.");
                resetTrackAndTokenSelectionModal();
                return;
            }

            showLoader();

            console.log("Approving token for album playback...");
            await approveToken(token, jukeboxContract.address, wholeAlbumFee);

            console.log(`Initiating album playback transaction for "${albumName}"...`);
            const tx = await jukeboxContract.playAlbum(albumName, token, {
                gasLimit: ethers.utils.hexlify(300000),
            });

            console.log("Transaction Hash:", tx.hash);
            await tx.wait();

            console.log(`Album "${albumName}" payment successful! Starting playback...`);

            controlsView.classList.add("hidden");
            recordView.classList.remove("hidden");

            // Start playing album tracks
            isPlayingAlbum = true;
            currentTrackIndex = 0;

            // Setup track ended event listener for album playback
            const handleAlbumTrackEnd = async () => {
                console.log(`\n=== Track ${currentTrackIndex + 1} Completed ===`);
                currentTrackIndex++;
                if (currentTrackIndex < trackList.length && isPlayingAlbum) {
                    console.log(`Moving to track ${currentTrackIndex + 1} of ${trackList.length}`);
                    await playNextTrack(trackList);
                } else {
                    console.log("\n=== Album Playback Complete ===");
                    console.log(`Finished playing ${trackList.length} tracks`);
                    isPlayingAlbum = false;
                    currentTrackIndex = 0;
                    document.removeEventListener('trackEnded', handleAlbumTrackEnd);
                }
            };

            document.addEventListener('trackEnded', handleAlbumTrackEnd);

            // Start playing the first track
            console.log("\n=== Starting First Track ===");
            await playNextTrack(trackList);

        } catch (error) {
            console.error("Error during album playback:", error);
            alert("Error playing album. Please try again.");
        } finally {
            resetTrackAndTokenSelectionModal();
            hideLoader();
        }
    });

    const playNextTrack = async (trackList) => {
        if (!isPlayingAlbum || currentTrackIndex >= trackList.length) {
            console.log("Album playback completed or stopped");
            isPlayingAlbum = false;
            currentTrackIndex = 0;
            recordView.classList.add("hidden");
            controlsView.classList.remove("hidden");
            return;
        }

        const trackFilename = trackList[currentTrackIndex];
        console.log(`\n=== Loading Track ${currentTrackIndex + 1}/${trackList.length} ===`);
        console.log(`Filename: ${trackFilename}`);

        // Try loading from multiple gateways
        for (const gateway of ipfsGateways) {
            try {
                const trackUrl = `${gateway}/${trackFilename}`;
                console.log(`Attempting to load from: ${gateway}`);
                const response = await fetch(trackUrl);
                if (response.ok) {
                    console.log("Successfully loaded track from gateway");
                    const blob = await response.blob();
                    // Try to determine the content type from the filename
                    const fileExtension = trackFilename.split('.').pop().toLowerCase();
                    let contentType = 'audio/mpeg'; // default
                    if (fileExtension === 'mp3') contentType = 'audio/mpeg';
                    else if (fileExtension === 'm4a') contentType = 'audio/mp4';
                    else if (fileExtension === 'wav') contentType = 'audio/wav';
                    else if (fileExtension === 'ogg') contentType = 'audio/ogg';
                    
                    console.log(`Content type: ${contentType}`);
                    const correctedBlob = new Blob([blob], { type: contentType });
                    const blobUrl = URL.createObjectURL(correctedBlob);
                    
                    customPlayer.loadTrack(blobUrl, trackFilename);
                    customPlayer.play();
                    console.log("Track playback started");
                    return; // Successfully loaded and playing
                }
            } catch (error) {
                console.log(`Failed to load from gateway: ${gateway}`);
            }
        }
        
        // If we get here, all gateways failed
        console.error(`Failed to load track ${currentTrackIndex + 1} from all gateways`);
        currentTrackIndex++;
        playNextTrack(trackList); // Skip to next track
    };

    backToControlsButton.addEventListener("click", () => {
        console.log("\n=== Playback Stopped by User ===");
        recordView.classList.add("hidden");
        controlsView.classList.remove("hidden");
        isPlayingAlbum = false;
        if (customPlayer) {
            customPlayer.pause();
        }
    });
};