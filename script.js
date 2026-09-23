const SUPABASE_URL = "https://yyxbvbbrvxamuepbnvun.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_2byxZ-r8Mpk7dZyeZ9PIkQ_e7qMmifC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let currentUser = null;
let currentFriend = null;
let messageChannel = null;


// ==========================
// LOGIN / REGISTER
// ==========================

function showRegister() {
    document.getElementById("loginBox").classList.add("hidden");
    document.getElementById("registerBox").classList.remove("hidden");
}

function showLogin() {
    document.getElementById("registerBox").classList.add("hidden");
    document.getElementById("loginBox").classList.remove("hidden");
}


// ==========================
// REGISTER
// ==========================

async function register() {

    const username =
        document.getElementById("registerUsername").value.trim();

    const name =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const message =
        document.getElementById("registerMessage");


    if (!username || !name || !email || !password) {
        message.innerText = "Please fill all fields.";
        return;
    }

    if (password.length < 6) {
        message.innerText =
            "Password must be at least 6 characters.";
        return;
    }

    message.innerText = "Creating account...";


    const { data: existingUser, error: usernameError } =
        await supabaseClient
            .from("profiles")
            .select("username")
            .eq("username", username)
            .maybeSingle();


    if (usernameError) {
        message.innerText = usernameError.message;
        return;
    }


    if (existingUser) {
        message.innerText = "Username already exists.";
        return;
    }


    const { data, error } =
        await supabaseClient.auth.signUp({
            email: email,
            password: password
        });


    if (error) {
        message.innerText = error.message;
        return;
    }


    const user = data.user;


    if (!user) {
        message.innerText =
            "Account could not be created.";
        return;
    }


    const { error: profileError } =
        await supabaseClient
            .from("profiles")
            .insert({
                id: user.id,
                username: username,
                full_name: name
            });


    if (profileError) {
        message.innerText =
            profileError.message;
        return;
    }


    message.innerText =
        "Account created! You can now login.";
}


// ==========================
// LOGIN
// ==========================

async function login() {

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");


    if (!email || !password) {
        message.innerText =
            "Please enter email and password.";
        return;
    }


    message.innerText = "Logging in...";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {
        message.innerText = error.message;
        return;
    }


    currentUser = data.user;

    await openMessenger();
}


// ==========================
// OPEN MESSENGER
// ==========================

async function openMessenger() {

    document.getElementById("authPage")
        .classList.add("hidden");

    document.getElementById("messengerPage")
        .classList.remove("hidden");


    await loadMyProfile();

    await loadFriends();
}


// ==========================
// MY PROFILE
// ==========================

async function loadMyProfile() {

    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select("username, full_name")
            .eq("id", currentUser.id)
            .single();


    if (error) {
        console.error(error);
        return;
    }


    document.getElementById("myUsername").innerText =
        "@" + data.username;
}


// ==========================
// LOGOUT
// ==========================

async function logout() {

    if (messageChannel) {

        await supabaseClient
            .removeChannel(messageChannel);

        messageChannel = null;
    }


    await supabaseClient.auth.signOut();

    currentUser = null;
    currentFriend = null;


    document.getElementById("messengerPage")
        .classList.add("hidden");

    document.getElementById("authPage")
        .classList.remove("hidden");
}


// ==========================
// CHECK LOGIN
// ==========================

async function checkLogin() {

    const { data } =
        await supabaseClient.auth.getSession();


    if (data.session) {

        currentUser =
            data.session.user;

        await openMessenger();
    }
}

checkLogin();


// ==========================
// LOAD FRIENDS
// ==========================

async function loadFriends() {

    const friendsList =
        document.getElementById("friendsList");


    friendsList.innerHTML =
        '<p class="empty">Loading friends...</p>';


    const { data, error } =
        await supabaseClient
            .from("friendships")
            .select("friend_id")
            .eq("user_id", currentUser.id);


    if (error) {

        console.error(error);

        friendsList.innerHTML =
            '<p class="empty">Could not load friends.</p>';

        return;
    }


    if (!data || data.length === 0) {

        friendsList.innerHTML =
            '<p class="empty">No friends yet</p>';

        return;
    }


    friendsList.innerHTML = "";


    for (const friendship of data) {

        const { data: friend } =
            await supabaseClient
                .from("profiles")
                .select("id, username, full_name")
                .eq("id", friendship.friend_id)
                .single();


        if (!friend) continue;


        const friendElement =
            document.createElement("div");


        friendElement.className = "friend";


        friendElement.innerHTML = `

            <div class="avatar">
                ${friend.username.charAt(0).toUpperCase()}
            </div>

            <div>
                <div class="friend-name">
                    ${escapeHTML(friend.full_name)}
                </div>

                <div class="friend-status">
                    ● Online
                </div>
            </div>

        `;


        friendElement.onclick = () => {
            openChat(friend);
        };


        friendsList.appendChild(friendElement);
    }
}


// ==========================
// ADD FRIEND
// ==========================

function openAddFriend() {

    document.getElementById("addFriendModal")
        .classList.remove("hidden");
}


function closeAddFriend() {

    document.getElementById("addFriendModal")
        .classList.add("hidden");
}


async function addFriend() {

    const username =
        document.getElementById("friendUsername")
            .value.trim();


    const message =
        document.getElementById("friendMessage");


    if (!username) {

        message.innerText =
            "Enter a username.";

        return;
    }


    const { data: friend, error } =
        await supabaseClient
            .from("profiles")
            .select("id, username")
            .eq("username", username)
            .maybeSingle();


    if (error) {

        message.innerText =
            error.message;

        return;
    }


    if (!friend) {

        message.innerText =
            "User not found.";

        return;
    }


    if (friend.id === currentUser.id) {

        message.innerText =
            "You cannot add yourself.";

        return;
    }


    const { data: existing } =
        await supabaseClient
            .from("friend_requests")
            .select("id, status")
            .eq("sender_id", currentUser.id)
            .eq("receiver_id", friend.id)
            .maybeSingle();


    if (existing) {

        message.innerText =
            "Friend request already exists.";

        return;
    }


    const { error: requestError } =
        await supabaseClient
            .from("friend_requests")
            .insert({
                sender_id: currentUser.id,
                receiver_id: friend.id,
                status: "pending"
            });


    if (requestError) {

        message.innerText =
            requestError.message;

        return;
    }


    message.innerText =
        "Friend request sent!";
}


// ==========================
// FRIEND REQUESTS
// ==========================

async function openRequests() {

    document.getElementById("requestsModal")
        .classList.remove("hidden");


    const requestsList =
        document.getElementById("requestsList");


    requestsList.innerHTML =
        "Loading...";


    const { data, error } =
        await supabaseClient
            .from("friend_requests")
            .select("id, sender_id, status, created_at")
            .eq("receiver_id", currentUser.id)
            .eq("status", "pending");


    if (error) {

        requestsList.innerHTML =
            error.message;

        return;
    }


    if (!data || data.length === 0) {

        requestsList.innerHTML =
            "<p>No new friend requests.</p>";

        return;
    }


    requestsList.innerHTML = "";


    for (const request of data) {

        const { data: sender } =
            await supabaseClient
                .from("profiles")
                .select("id, username, full_name")
                .eq("id", request.sender_id)
                .single();


        if (!sender) continue;


        const item =
            document.createElement("div");


        item.className =
            "request-item";


        item.innerHTML = `

            <strong>
                ${escapeHTML(sender.full_name)}
            </strong>

            <p>
                @${escapeHTML(sender.username)}
                wants to be your friend.
            </p>

            <div class="request-buttons">

                <button
                    class="accept-btn"
                    onclick="acceptRequest(
                        '${request.id}',
                        '${sender.id}'
                    )"
                >
                    Accept
                </button>

                <button
                    class="reject-btn"
                    onclick="rejectRequest(
                        '${request.id}'
                    )"
                >
                    Reject
                </button>

            </div>
        `;


        requestsList.appendChild(item);
    }
}


// ==========================
// ACCEPT REQUEST
// ==========================

async function acceptRequest(requestId, senderId) {

    const { error: updateError } =
        await supabaseClient
            .from("friend_requests")
            .update({
                status: "accepted"
            })
            .eq("id", requestId)
            .eq("receiver_id", currentUser.id);


    if (updateError) {

        alert(updateError.message);
        return;
    }


    const { error: firstError } =
        await supabaseClient
            .from("friendships")
            .insert({
                user_id: currentUser.id,
                friend_id: senderId
            });


    if (firstError) {

        alert(firstError.message);
        return;
    }


    const { error: secondError } =
        await supabaseClient
            .from("friendships")
            .insert({
                user_id: senderId,
                friend_id: currentUser.id
            });


    if (secondError) {

        alert(secondError.message);
        return;
    }


    await loadFriends();

    await openRequests();
}


// ==========================
// REJECT REQUEST
// ==========================

async function rejectRequest(requestId) {

    const { error } =
        await supabaseClient
            .from("friend_requests")
            .update({
                status: "rejected"
            })
            .eq("id", requestId)
            .eq("receiver_id", currentUser.id);


    if (error) {

        alert(error.message);
        return;
    }


    await openRequests();
}


function closeRequests() {

    document.getElementById("requestsModal")
        .classList.add("hidden");
}


// ==================================================
// CHAT
// ==================================================


// OPEN CHAT

async function openChat(friend) {

    currentFriend = friend;


    document.getElementById("welcomeChat")
        .classList.add("hidden");


    document.getElementById("chatHeader")
        .classList.remove("hidden");


    document.getElementById("messages")
        .classList.remove("hidden");


    document.getElementById("messageBox")
        .classList.remove("hidden");


    document.getElementById("chatFriendName")
        .innerText = friend.full_name;


    document.getElementById("chatFriendStatus")
        .innerText = "● Online";


    await loadMessages();

    subscribeToMessages();
}


// ==========================
// LOAD MESSAGES
// ==========================

async function loadMessages() {

    if (!currentFriend) return;


    const messagesContainer =
        document.getElementById("messages");


    messagesContainer.innerHTML =
        '<p class="empty">Loading messages...</p>';


    const { data, error } =
        await supabaseClient
            .from("messages")
            .select("*")
            .or(
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentFriend.id}),and(sender_id.eq.${currentFriend.id},receiver_id.eq.${currentUser.id})`
            )
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(error);

        messagesContainer.innerHTML =
            '<p class="empty">Could not load messages.</p>';

        return;
    }


    messagesContainer.innerHTML = "";


    if (!data || data.length === 0) {

        messagesContainer.innerHTML =
            '<p class="empty">No messages yet. Say hello 👋</p>';

        return;
    }


    data.forEach(message => {

        displayMessage(message);

    });


    scrollMessagesToBottom();
}


// ==========================
// DISPLAY MESSAGE
// ==========================

function displayMessage(message) {

    const messagesContainer =
        document.getElementById("messages");


    // Avoid duplicates

    if (
        document.querySelector(
            `[data-message-id="${message.id}"]`
        )
    ) {
        return;
    }


    const wrapper =
        document.createElement("div");


    wrapper.className = "message";


    wrapper.dataset.messageId =
        message.id;


    if (message.sender_id === currentUser.id) {

        wrapper.classList.add("sent");
    }


    const bubble =
        document.createElement("div");


    bubble.className =
        "message-bubble";


    const time =
        new Date(message.created_at)
            .toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });


    bubble.innerHTML = `

        <div>
            ${escapeHTML(message.message)}
        </div>

        <small style="
            display:block;
            opacity:0.65;
            margin-top:4px;
            font-size:10px;
        ">
            ${time}
        </small>

    `;


    wrapper.appendChild(bubble);

    messagesContainer.appendChild(wrapper);
}


// ==========================
// SEND MESSAGE
// ==========================

async function sendMessage() {

    if (!currentFriend) {

        return;
    }


    const input =
        document.getElementById("messageInput");


    const text =
        input.value.trim();


    if (!text) {

        return;
    }


    input.disabled = true;


    const { data, error } =
        await supabaseClient
            .from("messages")
            .insert({

                sender_id: currentUser.id,

                receiver_id: currentFriend.id,

                message: text

            })
            .select()
            .single();


    input.disabled = false;


    if (error) {

        alert(error.message);

        return;
    }


    input.value = "";

    input.focus();


    // Display immediately

    displayMessage(data);

    scrollMessagesToBottom();
}


// ==========================
// ENTER TO SEND
// ==========================

document.addEventListener("keydown", function(event) {

    if (
        event.key === "Enter" &&
        document.activeElement.id === "messageInput"
    ) {

        event.preventDefault();

        sendMessage();
    }

});


// ==========================
// REALTIME
// ==========================

function subscribeToMessages() {

    if (messageChannel) {

        supabaseClient
            .removeChannel(messageChannel);

        messageChannel = null;
    }


    messageChannel =
        supabaseClient
            .channel(
                "chat-" +
                currentUser.id +
                "-" +
                currentFriend.id
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                payload => {

                    const message =
                        payload.new;


                    const belongsToChat =
                        (
                            message.sender_id === currentUser.id &&
                            message.receiver_id === currentFriend.id
                        )
                        ||
                        (
                            message.sender_id === currentFriend.id &&
                            message.receiver_id === currentUser.id
                        );


                    if (belongsToChat) {

                        displayMessage(message);

                        scrollMessagesToBottom();
                    }

                }
            )
            .subscribe();
}


// ==========================
// SCROLL
// ==========================

function scrollMessagesToBottom() {

    const container =
        document.getElementById("messages");


    setTimeout(() => {

        container.scrollTop =
            container.scrollHeight;

    }, 50);
}


// ==========================
// SEARCH FRIENDS
// ==========================

document
    .getElementById("friendSearch")
    ?.addEventListener("input", function() {

        const search =
            this.value.toLowerCase();


        const friends =
            document.querySelectorAll(".friend");


        friends.forEach(friend => {

            const name =
                friend.innerText.toLowerCase();


            friend.style.display =
                name.includes(search)
                    ? "flex"
                    : "none";

        });

    });


// ==========================
// SECURITY HELPER
// ==========================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}
