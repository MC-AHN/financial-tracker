const form = document.getElementById('form');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    message.textContent = '';
    message.style.color = 'red';

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })

        const result = await response.json();

        if (response.status === 201 && result.success) {
            message.style.color = 'green';
            message.innerHTML = 'Registrasi ** success ** please <a href="/login/">login</a>';
            form.reset()
        } else {
            message.textContent = result.message || 'Failed Registrasi'
        }
    } catch (error) { message.textContent = `Failed in Network, please try again. </br> Error: ${error}` }
})
