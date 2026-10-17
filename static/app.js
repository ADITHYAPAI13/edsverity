const search=document.getElementById('listingSearch');
if(search){search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();document.querySelectorAll('#listingGrid .content-card').forEach(x=>{x.style.display=x.textContent.toLowerCase().includes(q)?'':'none'});});}
if(location.search.includes('sent=1')){const form=document.querySelector('.form-panel');if(form)form.insertAdjacentHTML('beforebegin','<div class="note" role="status">Message saved in this prototype’s local database.</div>');}
