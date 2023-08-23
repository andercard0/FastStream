import { WebVTT } from "../modules/vtt.mjs";
import { SubtitleTrack } from "../SubtitleTrack.mjs";
import { SubtitleUtils } from "../utils/SubtitleUtils.mjs";
import { Utils } from "../utils/Utils.mjs";
import { DOMElements } from "./DOMElements.mjs";

const API_KEY = "jolY3ZCVYguxFxl8CkIKl52zpHJT2eTw";
export class SubtitlesManager {
    constructor(client) {
        this.client = client;
        this.tracks = [];

        this.activeTracks = [];

        this.settings = {
            "font-size": "40px",
            color: "rgba(255,255,255,1)",
            background: "rgba(10,10,10,0.3)",
            "default-lang": "en",
        }

        this.isTesting = false;
        this.setupUI();
    }

    addTrack(track) {
        this.tracks.push(track);

        this.updateTrackList();
    }

    activateTrack(track) {
        if (this.activeTracks.indexOf(track) === -1) {
            this.activeTracks.push(track);
            this.updateTrackList();
        }
    }

    deactivateTrack(track) {
        let ind = this.activeTracks.indexOf(track);
        if (ind !== -1) {
            this.activeTracks.splice(ind, 1);
            this.updateTrackList();
        }
    }
    clearTracks() {
        this.tracks.length = 0;
        this.activeTracks.length = 0;
        this.updateTrackList();

    }

    removeTrack(track) {
        let ind = this.tracks.indexOf(track);
        if (ind !== -1) this.tracks.splice(ind, 1);
        ind = this.activeTracks.indexOf(track);
        if (ind !== -1) this.activeTracks.splice(ind, 1);

        this.updateTrackList();
    }

    updateSettings() {
        try {
            chrome.storage.sync.set({
                subtitlesSettings: JSON.stringify(this.settings)
            });
        } catch (e) {
            console.error(e);
        }
        this.renderSubtitles();
    }
    updateSettingsUI() {
        DOMElements.subtitlesOptionsList.innerHTML = "";
        for (let key in this.settings) {
            let option = document.createElement("div");
            option.classList.add("option");

            let label = document.createElement("div");
            label.textContent = key.charAt(0).toUpperCase() + key.substring(1);

            let input = document.createElement("input");
            input.type = "text";
            input.value = this.settings[key];
            let timeout = null;
            input.addEventListener("keyup", () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.settings[key] = input.value;
                    this.updateSettings();
                }, 200);
            });
            input.addEventListener("change", () => {
                this.settings[key] = input.value;
                this.updateSettings();
            });
            option.appendChild(label);
            option.appendChild(input);
            DOMElements.subtitlesOptionsList.appendChild(option);
        }
    }

    loadSettings() {
        try {
            chrome.storage.sync.get("subtitlesSettings", (data) => {
                if (data.subtitlesSettings) {
                    let settings = JSON.parse(data.subtitlesSettings);
                    for (let key in this.settings) {
                        if (settings[key]) {
                            this.settings[key] = settings[key];
                        }
                    }
                    this.renderSubtitles();
                    this.updateSettingsUI();
                } else {
                    this.updateSettingsUI();
                }
            });
        } catch (e) {
            console.error(e);
            this.updateSettingsUI();
        }
    }
    setupUI() {
        this.loadSettings();

        DOMElements.subtitlesMenu.addEventListener("wheel", (e) => {
            e.stopPropagation();
        });
        DOMElements.subtitlesOptionsList.addEventListener("keydown", (e) => {
            e.stopPropagation();
        });

        DOMElements.subtitlesOptionsList.addEventListener("keyup", (e) => {
            e.stopPropagation();
        });


        DOMElements.subtitles.addEventListener("click", (e) => {

            if (DOMElements.subtitlesMenu.style.display == "none") {
                DOMElements.subtitlesMenu.style.display = "";
            } else {
                DOMElements.subtitlesMenu.style.display = "none"
            }
            e.stopPropagation();
        })

        DOMElements.playerContainer.addEventListener("click", (e) => {
            DOMElements.subtitlesMenu.style.display = "none";
            DOMElements.subuiContainer.style.display = "none";
        });

        DOMElements.subtitlesOptionsTestButton.addEventListener("click", (e) => {
            this.isTesting = !this.isTesting;
            if (this.isTesting) {
                DOMElements.subtitlesOptionsTestButton.textContent = "Stop Testing";
                DOMElements.playerContainer.style.backgroundImage = "linear-gradient(to right, black, white)";
            } else {
                DOMElements.subtitlesOptionsTestButton.textContent = "Test Subtitles";
                DOMElements.playerContainer.style.backgroundImage = "";

            }

            this.renderSubtitles();
        });
        var filechooser = document.createElement("input");
        filechooser.type = "file";
        filechooser.style = "display: none";
        filechooser.accept = ".vtt, .srt";

        filechooser.addEventListener("change", () => {
            var files = filechooser.files;
            if (!files || !files[0]) return;
            let file = files[0];
            var name = file.name;
            //  var ext = name.substring(name.length - 4);

            var reader = new FileReader();
            reader.onload = () => {
                var dt = reader.result;
                //   if (ext == ".srt") dt = srt2webvtt(dt);
                let track = new SubtitleTrack(name, null);
                track.loadText(dt);

                this.addTrack(track);
            }
            reader.readAsText(file);

        })
        document.body.appendChild(filechooser);

        var filebutton = document.createElement('div');
        filebutton.textContent = "Upload File"
        filebutton.style = "padding: 3px 5px; color: rgba(255,255,255,.8)";

        filebutton.addEventListener("click", (e) => {
            filechooser.click();
        })
        DOMElements.subtitlesView.appendChild(filebutton)

        var urlbutton = document.createElement('div');
        urlbutton.textContent = "From URL"
        urlbutton.style = "border-top: 1px solid rgba(255,255,255,0.4); padding: 3px 5px; color: rgba(255,255,255,.8)";

        urlbutton.addEventListener("click", (e) => {
            var url = prompt("Enter URL")

            if (url) {
                Utils.simpleRequest(url, (err, req, body) => {
                    if (body) {

                        let track = new SubtitleTrack("URL Track", null);
                        track.loadText(body);

                        this.addTrack(track);
                    }
                })
            }

        })


        DOMElements.subtitlesView.appendChild(urlbutton)

        var internetbutton = document.createElement('div');
        internetbutton.textContent = "Search OpenSubtitles"
        internetbutton.style = "border-top: 1px solid rgba(255,255,255,0.4); padding: 3px 5px; color: rgba(255,255,255,.8)";

        internetbutton.addEventListener("click", (e) => {
            DOMElements.subuiContainer.style.display = "";
            DOMElements.linkuiContainer.style.display = "none";
            this.subui.search.focus()
        })
        DOMElements.subtitlesView.appendChild(internetbutton)

        var clearbutton = document.createElement('div');
        clearbutton.textContent = "Clear Subtitles"
        clearbutton.style = "border-top: 1px solid rgba(255,255,255,0.4); padding: 3px 5px; color: rgba(255,255,255,.8)";

        clearbutton.addEventListener("click", (e) => {
            this.clearTracks();
        })
        DOMElements.subtitlesView.appendChild(clearbutton)

        var optionsbutton = document.createElement('div');
        optionsbutton.textContent = "Subtitle Settings"
        optionsbutton.style = "border-top: 1px solid rgba(255,255,255,0.4); padding: 3px 5px; color: rgba(255,255,255,.8)";

        optionsbutton.addEventListener("click", (e) => {
            DOMElements.subtitlesOptions.style.display = "";
            DOMElements.subtitlesView.style.display = "none";
        });

        DOMElements.subtitlesOptionsBackButton.addEventListener("click", (e) => {
            DOMElements.subtitlesOptions.style.display = "none";
            DOMElements.subtitlesView.style.display = "";
        });

        DOMElements.subtitlesView.appendChild(optionsbutton)

        DOMElements.subtitlesMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
        })
        this.subtitleQueryUI();



    }

    subtitleQueryUI() {

        DOMElements.subuiContainer.addEventListener("click", (e) => {
            e.stopPropagation();
        })
        DOMElements.subuiContainer.addEventListener('dblclick', (e) => {
            e.stopPropagation();
        });

        DOMElements.subuiContainer.addEventListener("keydown", (e) => {
            e.stopPropagation();
        });

        DOMElements.subuiContainer.addEventListener("keyup", (e) => {
            e.stopPropagation();
        });

        DOMElements.subuiContainer.addEventListener("keypress", (e) => {
            e.stopPropagation();
        });

        DOMElements.subuiContainer.getElementsByClassName("close_button")[0].addEventListener("click", (e) => {
            DOMElements.subuiContainer.style.display = "none";
        });
        this.subui = {};
        this.subui.searchContainer = document.createElement('div');
        this.subui.searchContainer.classList.add("subtitle-search-container");

        DOMElements.subuiContainer.appendChild(this.subui.searchContainer);


        const searchInput = Utils.create("input", null, "text_input");
        searchInput.placeholder = "Search by title, filename, etc...";
        searchInput.classList.add("subtitle-search-input");
        this.subui.searchContainer.appendChild(searchInput);

        this.subui.search = searchInput;

        const searchBtn = Utils.create("div", "Search", "subtitle-search-btn");
        searchBtn.textContent = "Search";
        this.subui.searchContainer.appendChild(searchBtn);


        const seasonInput = Utils.create("input", null, "text_input");
        seasonInput.placeholder = "Season #";
        seasonInput.classList.add("subtitle-season-input");
        seasonInput.style.display = "none";

        const episodeInput = Utils.create("input", null, "text_input");
        episodeInput.placeholder = "Episode #";
        episodeInput.classList.add("subtitle-episode-input");
        episodeInput.style.display = "none";

        const typeSelector = Utils.createDropdown("all",
            "Type", {
            "all": "All",
            "movie": "Movie",
            "episode": "Episode"
        }, (val) => {
            if (val == "episode") {
                seasonInput.style.display = "";
                episodeInput.style.display = "";
            } else {
                seasonInput.style.display = "none";
                episodeInput.style.display = "none";
            }
        }
        );

        typeSelector.classList.add("subtitle-type-selector");

        this.subui.searchContainer.appendChild(typeSelector)
        this.subui.searchContainer.appendChild(seasonInput)
        this.subui.searchContainer.appendChild(episodeInput)


        const languageInput = Utils.create("input", null, "text_input");
        languageInput.placeholder = "Language";
        languageInput.classList.add("subtitle-language-input");
        languageInput.value = this.settings["default-lang"];
        this.subui.searchContainer.appendChild(languageInput)

        const yearInput = Utils.create("input", null, "text_input");
        yearInput.placeholder = "Year";
        yearInput.classList.add("subtitle-year-input");
        this.subui.searchContainer.appendChild(yearInput)



        const sortSelector = Utils.createDropdown("download_count",
            "Sort By", {
            "download_count": "Downloads",
            "upload_date": "Upload Date",
            "rating": "Rating",
            "votes": "Votes",
        }
        );
        sortSelector.classList.add("subtitle-sort-selector");
        this.subui.searchContainer.appendChild(sortSelector);


        const sortDirectionSelector = Utils.createDropdown("desc",
            "Sort", {
            "desc": "Descending",
            "asc": "Ascending",
        }
        );

        sortDirectionSelector.classList.add("subtitle-sort-direction-selector");
        this.subui.searchContainer.appendChild(sortDirectionSelector)


        const searchOnEnter = (e) => {
            if (e.key == "Enter") {
                this.subui.search.blur();
                this.queryOpenSubtitles({
                    query: this.subui.search.value,
                    type: typeSelector.dataset.val,
                    season: seasonInput.value,
                    episode: episodeInput.value,
                    language: languageInput.value,
                    year: yearInput.value,
                    sortBy: sortSelector.dataset.val,
                    sortDirection: sortDirectionSelector.dataset.val,
                    page: 1
                });
            }
            e.stopPropagation();
        };
        
        this.subui.search.addEventListener("keydown", searchOnEnter, true);
        languageInput.addEventListener("keydown", searchOnEnter, true);
        yearInput.addEventListener("keydown", searchOnEnter, true);
        seasonInput.addEventListener("keydown", searchOnEnter, true);
        episodeInput.addEventListener("keydown", searchOnEnter, true);

        searchBtn.addEventListener("click", (e) => {
            this.queryOpenSubtitles({
                query: this.subui.search.value,
                type: typeSelector.dataset.val,
                season: seasonInput.value,
                episode: episodeInput.value,
                language: languageInput.value,
                year: yearInput.value,
                sortBy: sortSelector.dataset.val,
                sortDirection: sortDirectionSelector.dataset.val,
                page: 1
            });
        })

        this.subui.results = document.createElement('div');
        this.subui.results.classList.add("subtitle-results");
        DOMElements.subuiContainer.appendChild(this.subui.results)

    }
    async queryOpenSubtitles(query) {

        let translatedQuery = {
            query: query.query,
            type: query.type,
            languages: query.language,
            year: query.year,
            order_by: query.sortBy,
            sort_direction: query.sortDirection,
            page: query.page
        }

        if (query.type === "episode") {
            translatedQuery.season = query.season;
            translatedQuery.episode = query.episode;
        }

        this.subui.results.innerHTML = "";
        var container = document.createElement("div");
        container.textContent = "Searching...";
        this.subui.results.appendChild(container);


        let data;
        try {
            data = (await Utils.request({
                responseType: "json",
                url: "https://api.opensubtitles.com/api/v1/subtitles",
                query: translatedQuery,
                headers: {
                    "Api-Key": API_KEY
                },
                header_commands: [
                    {
                        operation: 'set',
                        header: 'User-Agent',
                        value: 'FastStream V' + chrome.runtime.getManifest().version
                    }
                ]
            })).response.data;

        } catch (e) {
            console.log(e)
            if (DOMElements.subuiContainer.style.display == "none") return;
            alert("OpenSubtitles is down!");
            return;
        }


        this.subui.results.innerHTML = "";

        if (data.length === 0) {
            var container = document.createElement("div");
            container.textContent = "No results found";
            this.subui.results.appendChild(container);
            return;
        }

        data.forEach((item) => {
            var container = document.createElement("div");
            container.style = "position: relative; overflow-y: scroll; user-select: none; cursor: pointer; font-family: Arial; font-size: 15px; width: 100%; height: 50px; color: rgba(255,255,255,.8); border-top: 1px solid rgba(255,255,255,0.1)"
            this.subui.results.appendChild(container);

            var lang = document.createElement("div");
            lang.style = "position: absolute; top: 50%; transform: translate(0%, -50%); left: 0px; text-align: center; width: 100px;"
            lang.textContent = item.attributes.language;
            container.appendChild(lang)

            var title = document.createElement("div");
            title.style = "position: absolute; left: 100px; width: calc(100% - 300px); top: 50%; padding: 0px 10px; transform: translate(0%, -50%);"
            title.textContent = item.attributes.feature_details.movie_name + " (" + item.attributes.feature_details.year + ")";
            container.appendChild(title)

            var user = document.createElement("div");
            user.style = "position: absolute; right: 60px; width: 100px; top: 50%; padding: 0px 10px; transform: translate(0%, -50%);"
            user.textContent = item.attributes.uploader.name;
            container.appendChild(user)


            var rank = document.createElement("div");
            rank.style = "position: absolute; right: 0px; width: 50px; top: 50%; transform: translate(0%, -50%);"
            rank.textContent = item.attributes.ratings;
            container.appendChild(rank)

            container.addEventListener("mouseenter", (e) => {
                container.style.color = "rgba(255,200,200,.8)"
            })
            container.addEventListener("mouseleave", (e) => {
                container.style.color = "rgba(255,255,255,.8)"
            })
            container.addEventListener("click", async (e) => {
                console.log(item.attributes.files[0].file_id)
                let body;
                if (item.downloading) {
                    alert("Already downloading!");
                    return;
                }

                item.downloading = true;

                try {
                    let link = item.cached_download_link;
                    if (!link) {
                        let data = (await Utils.request({
                            type: "POST",
                            url: "https://api.opensubtitles.com/api/v1/download",
                            responseType: "json",
                            headers: {
                                "Api-Key": API_KEY,
                                "Content-Type": "application/json"
                            },

                            header_commands: [
                                {
                                    operation: 'set',
                                    header: 'User-Agent',
                                    value: 'FastStream V' + chrome.runtime.getManifest().version
                                }
                            ],

                            data: JSON.stringify({
                                file_id: item.attributes.files[0].file_id,
                                sub_format: "webvtt"
                            })
                        })).response;

                        if (!data.link && data.remaining <= 0) {
                            item.downloading = false;
                            alert(`OpenSubtitles limits subtitle downloads! You have no more downloads left! Your quota resets in ` + data.reset_time);
                            if (confirm("Would you like to open the OpenSubtitles website to download the subtitle file manually?")) {
                                window.open(item.attributes.url);
                            }
                            return;
                        }

                        if (!data.link) {
                            throw new Error("No link");
                        }

                        item.cached_download_link = data.link;
                        link = data.link;
                    }

                    body = (await Utils.request({
                        url: link,

                        header_commands: [
                            {
                                operation: 'set',
                                header: 'User-Agent',
                                value: 'FastStream V' + chrome.runtime.getManifest().version
                            }
                        ]
                    }));

                    if (body.status < 200 || body.status >= 300) {
                        throw new Error("Bad status code");
                    }

                    body = body.responseText;

                    if (!body) {
                        throw new Error("No body");
                    }

                } catch (e) {
                    console.log(e)
                    if (DOMElements.subuiContainer.style.display == "none") return;
                    alert("OpenSubtitles is down!");
                    item.downloading = false;
                    return;
                }

                item.downloading = false;
                let track = new SubtitleTrack(item.attributes.uploader.name + " - " + item.attributes.feature_details.movie_name, item.attributes.language);
                track.loadText(body);
                this.addTrack(track);
                this.activateTrack(track);

            });
        })
    }

    showPages(obj, list) {
        var total = Math.min(obj.total_pages, 1000);
        var page = obj.page;
        list.innerHTML = "";

        var start = Math.max(page - 5, 1);
        var max = Math.min(start + 10, total);
        var style = `
display: inline-block;
margin: 2px 3px;
user-select: none;
cursor: pointer;
padding: 3px 8px;
min-width: 15px;
text-align: center;
border-radius: 3px;
background-color: rgb(105, 75, 161);
color: rgb(200,200,200);
`
        var create = this.create;

        if (start > 1) {
            var el = create("div", style);
            el.textContent = 1;
            el.addEventListener("click", () => {
                this.searchDiscover(1)
            })
            list.appendChild(el);

            if (start > 2) {
                var el = create("div", style);
                el.textContent = "...";
                list.appendChild(el);
            }

        }
        for (var i = start; i <= max; i++) {
            ((i) => {

                var el = create("div", style);
                el.textContent = i;

                if (i === page) {
                    el.style.backgroundColor = "#453169";
                    el.contentEditable = true;
                    el.addEventListener("blur", () => {
                        el.textContent = i;
                    })
                    el.addEventListener("keydown", (e) => {
                        if (e.key === "Enter") {
                            this.searchDiscover(parseInt(el.textContent));
                            e.preventDefault();
                        }


                        e.stopPropagation();
                    })


                } else {
                    el.addEventListener("click", () => {
                        this.searchDiscover(i)
                    })
                }
                list.appendChild(el);


            })(i);
        }

        if (max < total) {
            if (max + 1 < total) {
                var el = create("div", style);
                el.textContent = "...";
                list.appendChild(el);
            }

            var el = create("div", style);
            el.textContent = total;
            el.addEventListener("click", () => {
                this.searchDiscover(total)
            })
            list.appendChild(el);
        }
    }


    updateTrackList() {

        DOMElements.subtitlesList.innerHTML = "";

        var tracks = this.tracks;
        for (var i = 0; i < tracks.length; i++) {
            ((i) => {
                var track = tracks[i];
                var trackElement = document.createElement('div');
                trackElement.style = "position: relative; border-bottom: 1px solid rgba(255,255,255,.4); padding: 3px 5px; color: rgba(255,255,255,.8)";

                let activeIndex = this.activeTracks.indexOf(track);
                let name = (track.language ? ("(" + track.language + ") ") : "") + (track.label || `Track ${i + 1}`);

                if (activeIndex !== -1) {
                    trackElement.style.color = "rgba(0,255,0,.6)";

                    if (this.activeTracks.length > 1) {
                        trackElement.textContent = (activeIndex + 1) + ": " + name;
                    } else {
                        trackElement.textContent = name;
                    }
                } else {
                    trackElement.style.color = "rgba(255,0,0,.7)";
                    trackElement.textContent = name;
                }



                trackElement.addEventListener("click", (e) => {
                    let ind = this.activeTracks.indexOf(track);
                    if (ind !== -1) {
                        this.deactivateTrack(track);
                    } else {
                        this.activateTrack(track);
                    }
                    e.stopPropagation();
                    e.preventDefault();
                })

                var downloadTrack = document.createElement("div");
                // border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid rgba(200,200,200,.4);
                downloadTrack.style = "display: none; position: absolute; right: 10px; top: 50%; transform: translate(0%,-50%); opacity: 0.7"
                downloadTrack.title = "Download subtitle file"
                downloadTrack.className = "fluid_button fluid_button_download"
                trackElement.appendChild(downloadTrack)

                downloadTrack.addEventListener("click", (e) => {
                    e.stopPropagation();
                }, true)

                downloadTrack.addEventListener("click", (e) => {


                    let dlname = prompt("Enter a name for the subtitle download file", name + ".srt");

                    if (!dlname) {
                        return;
                    }


                    let srt = SubtitleUtils.cuesToSrt(track.cues);
                    let blob = new Blob([srt], {
                        type: 'text/plain'
                    });
                    let url = window.URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = dlname;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    e.stopPropagation();
                }, true)

                var removeTrack = document.createElement("div");
                removeTrack.style = "display: none; position: absolute; right: 5px; top: 50%; width: 10px; height: 10px; transform: translate(0%,-50%); color: rgba(100,100,100,.5); background-color: rgba(255,0,0,.5); border-radius: 50%;"
                removeTrack.title = "Remove subtitle track"
                trackElement.appendChild(removeTrack)

                removeTrack.addEventListener("click", (e) => {
                    this.removeTrack(track);
                    e.stopPropagation();
                }, true)


                var shiftLTrack = document.createElement("div");
                shiftLTrack.style = "display: none; position: absolute; right: 70px; top: 50%; width: 0px; height: 0px; transform: translate(0%,-50%); border-right: 8px solid rgba(255,255,255,.5); border-bottom: 8px solid transparent; border-top: 8px solid transparent;"
                shiftLTrack.title = "Shift subtitles -0.2s"
                trackElement.appendChild(shiftLTrack)

                shiftLTrack.addEventListener("click", (e) => {
                    track.shift(-0.2)
                    this.renderSubtitles();
                    e.stopPropagation();
                }, true)

                var shiftLLTrack = document.createElement("div");
                shiftLLTrack.style = "display: none; position: absolute; right: 85px; top: 50%; width: 0px; height: 0px; transform: translate(0%,-50%); border-right: 8px solid rgba(200,200,200,.5); border-bottom: 8px solid transparent; border-top: 8px solid transparent;"
                shiftLLTrack.title = "Shift subtitles -2s"
                trackElement.appendChild(shiftLLTrack)

                shiftLLTrack.addEventListener("click", (e) => {
                    track.shift(-2)
                    this.renderSubtitles();
                    e.stopPropagation();
                }, true)

                var shiftRTrack = document.createElement("div");
                shiftRTrack.style = "display: none; position: absolute; right: 55px; top: 50%; width: 0px; height: 0px; transform: translate(0%,-50%); border-left: 8px solid rgba(255,255,255,.5); border-bottom: 8px solid transparent; border-top: 8px solid transparent;"
                shiftRTrack.title = "Shift subtitles +0.2s"
                trackElement.appendChild(shiftRTrack)

                shiftRTrack.addEventListener("click", (e) => {
                    track.shift(0.2)
                    this.renderSubtitles();
                    e.stopPropagation();
                }, true)


                var shiftRRTrack = document.createElement("div");
                shiftRRTrack.style = "display: none; position: absolute; right: 40px; top: 50%; width: 0px; height: 0px; transform: translate(0%,-50%); border-left: 8px solid rgba(200,200,200,.5); border-bottom: 8px solid transparent; border-top: 8px solid transparent;"
                shiftRRTrack.title = "Shift subtitles +2s"
                trackElement.appendChild(shiftRRTrack)

                shiftRRTrack.addEventListener("click", (e) => {
                    track.shift(2)
                    this.renderSubtitles();
                    e.stopPropagation();
                }, true)


                trackElement.addEventListener("mouseenter", () => {
                    downloadTrack.style.display = shiftRRTrack.style.display = shiftRTrack.style.display = shiftLTrack.style.display = shiftLLTrack.style.display = removeTrack.style.display = "block"
                })
                trackElement.addEventListener("mouseleave", () => {
                    downloadTrack.style.display = shiftRRTrack.style.display = shiftRTrack.style.display = shiftLTrack.style.display = shiftLLTrack.style.display = removeTrack.style.display = "none"
                })

                DOMElements.subtitlesList.appendChild(trackElement)
            })(i);
        }

        this.renderSubtitles();

    }

    applyStyles(trackContainer) {
        trackContainer.style.color = this.settings.color;
        trackContainer.style.fontSize = this.settings["font-size"];
        trackContainer.style.backgroundColor = this.settings.background;
    }
    renderSubtitles() {
        DOMElements.subtitlesContainer.innerHTML = "";

        if (this.isTesting) {
            let trackContainer = document.createElement("div");
            trackContainer.className = "subtitle-track";
            this.applyStyles(trackContainer);

            let cue = document.createElement("div");
            cue.textContent = "This is a test subtitle";
            trackContainer.appendChild(cue);

            const wrapper = document.createElement("div");
            wrapper.className = "subtitle-track-wrapper";
            wrapper.appendChild(trackContainer);
            DOMElements.subtitlesContainer.appendChild(wrapper);
        }
        let tracks = this.activeTracks;
        let currentTime = this.client.persistent.currentTime;
        tracks.forEach((track) => {
            let trackContainer = document.createElement("div");
            trackContainer.className = "subtitle-track";
            this.applyStyles(trackContainer);
            let cues = track.cues;
            let hasCues = false;

            let cueIndex = Utils.binarySearch(cues, currentTime, (time, cue) => {
                if (cue.startTime > time) {
                    return -1;
                } else if (cue.endTime < time) {
                    return 1;
                }
                return 0;
            })

            if (cueIndex > -1) {

                while (cueIndex > 0 && cues[cueIndex - 1].endTime >= currentTime && cues[cueIndex - 1].startTime <= currentTime) {
                    cueIndex--;
                }

                while (cueIndex < cues.length && cues[cueIndex].endTime >= currentTime && cues[cueIndex].startTime <= currentTime) {
                    let cue = cues[cueIndex];
                    if (!cue.dom) {
                        cue.dom = WebVTT.convertCueToDOMTree(window, cue.text);
                    }
                    hasCues = true;
                    trackContainer.appendChild(cue.dom);
                    cueIndex++;
                }

            }

            const wrapper = document.createElement("div");
            wrapper.className = "subtitle-track-wrapper";
            wrapper.appendChild(trackContainer);
            DOMElements.subtitlesContainer.appendChild(wrapper);

            if (!hasCues) {
                wrapper.style.opacity = 0;
                const fillerCue = document.createElement("div");
                trackContainer.appendChild(fillerCue);

                fillerCue.textContent = "|";

            }
        })
    }
}
