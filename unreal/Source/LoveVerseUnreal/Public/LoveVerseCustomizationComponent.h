#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "LVTypes.h"
#include "LoveVerseCustomizationComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLVAppearanceChanged, const FLVAvatarAppearance&, Appearance);

UCLASS(ClassGroup=(LoveVerse), meta=(BlueprintSpawnableComponent))
class LOVEVERSEUNREAL_API ULoveVerseCustomizationComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    ULoveVerseCustomizationComponent();

    UFUNCTION(BlueprintCallable, Category = "LoveVerse|Customization")
    void SetAppearance(const FLVAvatarAppearance& NewAppearance);

    UFUNCTION(BlueprintPure, Category = "LoveVerse|Customization")
    FLVAvatarAppearance GetAppearance() const { return Appearance; }

    UPROPERTY(BlueprintAssignable, Category = "LoveVerse|Customization")
    FLVAppearanceChanged OnAppearanceChanged;

protected:
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    UFUNCTION(Server, Reliable)
    void ServerSetAppearance(const FLVAvatarAppearance& NewAppearance);

private:
    UPROPERTY(ReplicatedUsing=OnRep_Appearance)
    FLVAvatarAppearance Appearance;

    UFUNCTION()
    void OnRep_Appearance();

    void ApplyAppearance(const FLVAvatarAppearance& NewAppearance);
};
