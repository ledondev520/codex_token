## T18 Log

- Verified the dashboard is already running locally on `127.0.0.1:4329` via the existing launchd agent.
- Added a dedicated SSH key for VPS preview access and installed the public key on the VPS root account.
- Configured nginx on the VPS to listen on public port `18080` and proxy to loopback port `14329`.
- Created a launchd-managed reverse tunnel script so the VPS loopback port maps back to the local dashboard.
- Verified the public endpoint returns the dashboard HTML when accessed with the configured credentials.
