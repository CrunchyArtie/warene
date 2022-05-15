class Toast {
    hey = (title, body) => {
        const toastLiveOriginal = document.getElementById('toast')
        if(!!toastLiveOriginal) {
            const toastLiveExample = toastLiveOriginal.cloneNode(true);
            if(!!title)
                toastLiveExample.getElementsByClassName('toast-header').item(0).innerHTML = title;
            if(!!body)
                toastLiveExample.getElementsByClassName('toast-body').item(0).innerHTML = body;
            toastLiveOriginal.after(toastLiveExample);
            const toast = new bootstrap.Toast(toastLiveExample)
            if (!!toast) {
                toast.show()
            }
        }
    }
}

export const toast = new Toast()
