import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

socket_app = socketio.ASGIApp(sio)

connected_agents = {}
connected_partners = {}
connected_partner_pincodes = {}


@sio.event
async def connect(sid, environ):
    print(f"Socket connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"Socket disconnected: {sid}")

    if sid in connected_agents:
        del connected_agents[sid]

    if sid in connected_partners:
        del connected_partners[sid]

    if sid in connected_partner_pincodes:
        del connected_partner_pincodes[sid]


@sio.event
async def register_agent(sid, data):
    """
    Agent registers after login.
    """

    connected_agents[sid] = data

    agent_id = data.get("agent_id")

    await sio.enter_room(
        sid,
        f"agent_{agent_id}",
    )

    print("Registered Agent:", data)
    print("Joined Room:", f"agent_{agent_id}")


@sio.event
async def register_partner(sid, data):
    """
    Partner registers after login.
    """

    connected_partners[sid] = data

    partner_id = data.get("partner_id")
    pincodes = data.get("pincodes", [])

    connected_partner_pincodes[sid] = pincodes

    print("Registered Partner:", data)
